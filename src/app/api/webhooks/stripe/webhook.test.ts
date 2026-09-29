import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const SECRET = "whsec_test_webhook_secret_for_vitest";
process.env.STRIPE_SECRET_KEY = "sk_test_vitest_dummy_key";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const confirm = vi.fn(async () => "paid");
vi.mock("@/lib/bookings", () => ({ confirmCheckoutSession: confirm, releaseHoldBySession: vi.fn() }));

const enabled = Boolean(process.env.DATABASE_URL);
const stripe = new Stripe("sk_test_vitest_dummy_key");
const eventId = `evt_test_${Date.now()}`;

function signed(payload: string) {
  return stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
}

describe("stripe webhook", () => {
  let POST: (req: Request) => Promise<Response>;
  let prisma: typeof import("@/lib/prisma").prisma;
  beforeAll(async () => {
    ({ POST } = await import("./route"));
    ({ prisma } = await import("@/lib/prisma"));
  });
  afterAll(async () => {
    if (enabled) await prisma.stripeEvent.deleteMany({ where: { id: eventId } });
  });

  it("rejects an unsigned or wrongly signed payload", async () => {
    const unsigned = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));
    expect(unsigned.status).toBe(400);
    const forged = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=deadbeef" } })
    );
    expect(forged.status).toBe(400);
    expect(confirm).not.toHaveBeenCalled();
  });

  it.skipIf(!enabled)("handles a signed event once, even when Stripe retries it", async () => {
    const payload = JSON.stringify({
      id: eventId,
      object: "event",
      type: "checkout.session.completed",
      livemode: false,
      data: { object: { id: "cs_test_x", object: "checkout.session", metadata: { bookingId: "b1" }, payment_status: "paid" } },
    });
    const send = () =>
      POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": signed(payload) } }));
    expect((await send()).status).toBe(200);
    const retry = await send();
    expect(retry.status).toBe(200);
    expect((await retry.json()).duplicate).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
