import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startFakeStripe, type FakeStripe } from "../../scripts/qa/fake-stripe.mjs";
import { Fixtures, waitFor } from "@/test/fixtures";

/**
 * The whole payment path against a real database and a local stand-in for Stripe: the app's own code
 * creates sessions, accounts and refunds through the real Stripe SDK; the stand-in answers like Stripe
 * and delivers signed webhooks over HTTP to the real webhook route.
 */

const mail = vi.hoisted(() => ({ sent: [] as { to: string; template: string }[] }));
vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(async (m: { to: string; template: string }) => {
    mail.sent.push({ to: m.to, template: m.template });
    return { ok: true, logged: true };
  }),
  emailProviderConfigured: () => false,
}));
vi.mock("@/lib/log", () => ({ log: { info() {}, warn() {}, error() {} }, scrubText: (s: string) => s }));
// Auth.js needs a Next request context; these routes are exercised as a signed-out visitor.
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn(async () => null) }));

const enabled = Boolean(process.env.DATABASE_URL);
const WEBHOOK_SECRET = "whsec_vitest_payments_integration";

let fake: FakeStripe;
let hook: http.Server;
const fx = new Fixtures();

// Loaded after the environment is prepared.
let prisma: typeof import("@/lib/prisma").prisma;
let bookings: typeof import("@/lib/bookings");
let payments: typeof import("@/lib/payments");
let statusRoute: typeof import("@/app/api/bookings/[id]/status/route");
let cronRoute: typeof import("@/app/api/cron/route");
let webhookRoute: typeof import("@/app/api/webhooks/stripe/route");
let tokens: typeof import("@/lib/tokens");

function serve(handler: (req: Request) => Promise<Response>) {
  return new Promise<http.Server>((resolve) => {
    const server = http.createServer(async (incoming, outgoing) => {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(chunk as Buffer);
      const res = await handler(
        new Request(`http://localhost${incoming.url}`, {
          method: incoming.method,
          headers: incoming.headers as Record<string, string>,
          body: Buffer.concat(chunks),
        })
      );
      outgoing.writeHead(res.status, { "content-type": "application/json" });
      outgoing.end(await res.text());
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const pay = (sessionId: string, delayMs = 0) => fetch(`${fake.url}/__control/complete/${sessionId}?delay=${delayMs}`, { method: "POST" }).then((r) => r.json() as Promise<{ paymentIntent: string | null }>);
const refundsFor = (paymentIntent: string) => [...fake.state.refunds.values()].filter((r) => r.payment_intent === paymentIntent);
const booking = (id: string) => prisma.booking.findUniqueOrThrow({ where: { id } });
const slotRow = (id: string) => prisma.slot.findUniqueOrThrow({ where: { id } });

async function connectedSalon(opts: { cancellationHours?: number } = {}) {
  const owner = await fx.user("SALON_OWNER");
  const salon = await fx.salon(owner.id, { cancellationHours: opts.cancellationHours });
  const account = await payments.createConnectedAccount(salon, owner.email);
  const updated = await prisma.salon.update({ where: { id: salon.id }, data: { stripeAccountId: account.id, stripeChargesEnabled: true } });
  return { owner, salon: updated };
}

async function checkout(slotId: string, customer: { id: string; email: string }) {
  const result = await bookings.startCheckout({
    slotId,
    customer: { id: customer.id, locale: "nl" },
    contact: { name: "Klant Test", email: customer.email },
  });
  const row = await booking(result.bookingId);
  return { result, row };
}

describe.skipIf(!enabled)("payments end to end (fake Stripe)", () => {
  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_vitest_payments";
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    process.env.CRON_SECRET = "cron-secret-for-vitest";
    process.env.AUTH_SECRET ||= "vitest-auth-secret";
    process.env.RATE_LIMIT_DISABLED = "false";
    webhookRoute = await import("@/app/api/webhooks/stripe/route");
    hook = await serve(webhookRoute.POST);
    fake = await startFakeStripe({ port: 0, webhookUrl: `http://127.0.0.1:${(hook.address() as { port: number }).port}/`, webhookSecret: WEBHOOK_SECRET, webhookDelayMs: 0 });
    process.env.STRIPE_API_URL = fake.url;
    ({ prisma } = await import("@/lib/prisma"));
    bookings = await import("@/lib/bookings");
    payments = await import("@/lib/payments");
    statusRoute = await import("@/app/api/bookings/[id]/status/route");
    cronRoute = await import("@/app/api/cron/route");
    tokens = await import("@/lib/tokens");
  });

  afterAll(async () => {
    await fx.cleanup();
    if (fake) {
      await prisma.stripeEvent.deleteMany({ where: { id: { in: fake.state.events.map((e) => e.id) } } });
      await fake.stop();
    }
    hook?.close();
    await prisma?.$disconnect();
  });

  it("charges the price from the database, takes the commission on the server and pays the salon's connected account", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id, { discount: 3100, original: 4800 });
    const customer = await fx.user();
    const { result, row } = await checkout(slot.id, customer);

    expect(result.kind).toBe("redirect");
    expect(row.status).toBe("PENDING");
    expect(row.paymentMode).toBe("TEST");
    expect(row.amount).toBe(3100);
    expect(row.feeAmount).toBe(Math.round((3100 * row.feePercent) / 100));
    expect(row.stripeDestination).toBe(salon.stripeAccountId);

    const session = fake.state.sessions.get(row.stripeSessionId!)!;
    expect(session.amount_total).toBe(3100);
    expect(session.currency).toBe("eur");
    expect(session.payment_intent_data.transfer_data.destination).toBe(salon.stripeAccountId);
    expect(Number(session.payment_intent_data.application_fee_amount)).toBe(row.feeAmount);
    expect(session.metadata.bookingId).toBe(row.id);
    expect(session.success_url).toContain(`/boeking/status?b=${row.id}`);

    // The same customer asking again gets the same open Checkout, not a second booking.
    const again = await checkout(slot.id, customer);
    expect(again.row.id).toBe(row.id);
    expect(again.result.kind === "redirect" && again.result.url).toBe(session.url);
    expect((await slotRow(slot.id)).spotsLeft).toBe(0);
  });

  it("marks a booking paid only after Stripe's signed webhook, and only once however often it is delivered", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id);
    const customer = await fx.user();
    const { row } = await checkout(slot.id, customer);
    mail.sent.length = 0;

    // Nothing is paid before Stripe says so.
    expect((await booking(row.id)).status).toBe("PENDING");

    const { paymentIntent } = await pay(row.stripeSessionId!);
    const paid = await waitFor(async () => {
      const b = await booking(row.id);
      return b.status === "PAID" ? b : false;
    }, 8000, "the webhook to mark the booking paid");
    expect(paid.stripePaymentId).toBe(paymentIntent);
    expect(paid.paidAt).not.toBeNull();
    expect((await slotRow(slot.id)).status).toBe("BOOKED");
    expect(mail.sent.filter((m) => m.template === "booking_confirmed" && m.to === customer.email)).toHaveLength(1);

    // Stripe delivers the same event again: it is acknowledged and changes nothing.
    const event = fake.state.events.find((e) => e.type === "checkout.session.completed" && e.data.object.id === row.stripeSessionId)!;
    await fetch(`${fake.url}/__control/resend/${event.id}`, { method: "POST" });
    await waitFor(async () => fake.state.deliveries.filter((d) => d.id === event.id).length >= 2, 4000, "the resend");
    expect(fake.state.deliveries.filter((d) => d.id === event.id).every((d) => d.status === 200)).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "booking_paid", entityId: row.id } })).toBe(1);
    expect(mail.sent.filter((m) => m.template === "booking_confirmed" && m.to === customer.email)).toHaveLength(1);
  });

  it("does not trust a redirect: an unsigned or forged webhook changes nothing", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id);
    const customer = await fx.user();
    const { row } = await checkout(slot.id, customer);
    const forged = JSON.stringify({ id: "evt_forged", type: "checkout.session.completed", data: { object: { id: row.stripeSessionId, metadata: { bookingId: row.id }, payment_status: "paid" } } });
    for (const headers of [{}, { "stripe-signature": "t=1,v1=deadbeef" }] as Record<string, string>[]) {
      const res = await webhookRoute.POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: forged, headers }));
      expect(res.status).toBe(400);
    }
    expect((await booking(row.id)).status).toBe("PENDING");
  });

  it("confirms a payment on the return page by asking Stripe, even when the webhook is late", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id);
    const customer = await fx.user();
    const { row } = await checkout(slot.id, customer);
    const token = tokens.bookingToken(row.id);
    const call = () => statusRoute.GET(new Request(`http://localhost/api/bookings/${row.id}/status?t=${token}`), { params: Promise.resolve({ id: row.id }) });

    // Not paid yet: the status page keeps waiting.
    expect(await (await call()).json()).toEqual({ status: "PENDING" });

    await pay(row.stripeSessionId!, 60_000); // the webhook arrives a minute later
    await prisma.rateLimit.deleteMany({ where: { key: `status:${row.id}` } });
    expect(await (await call()).json()).toEqual({ status: "PAID" });
    expect((await booking(row.id)).stripePaymentId).toMatch(/^pi_/);

    // Without the signed token or the login, the status is not readable.
    const stranger = await statusRoute.GET(new Request(`http://localhost/api/bookings/${row.id}/status`), { params: Promise.resolve({ id: row.id }) });
    expect(stranger.status).toBe(404);
  });

  it("refunds a payment whose amount does not match the booking", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id);
    const customer = await fx.user();
    const { row } = await checkout(slot.id, customer);
    await prisma.booking.update({ where: { id: row.id }, data: { amount: 3000, feeAmount: 540 } });

    const { paymentIntent } = await pay(row.stripeSessionId!);
    await waitFor(async () => (await booking(row.id)).status === "REFUNDED", 8000, "the mismatch refund");
    const after = await booking(row.id);
    expect(after.cancelReason).toBe("amount_mismatch");
    expect(refundsFor(paymentIntent!)).toHaveLength(1);
    expect((await slotRow(slot.id)).spotsLeft).toBe(1);
  });

  it("refunds a customer who pays after the hold ran out and someone else took the last spot", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id, { capacity: 1 });
    const late = await fx.user();
    const winner = await fx.user();
    const { row: lateBooking } = await checkout(slot.id, late);
    await prisma.booking.update({ where: { id: lateBooking.id }, data: { holdExpiresAt: new Date(Date.now() - 60_000) } });

    const { row: winning } = await checkout(slot.id, winner);
    await pay(winning.stripeSessionId!);
    await waitFor(async () => (await booking(winning.id)).status === "PAID", 8000, "the winner to be paid");

    mail.sent.length = 0;
    const { paymentIntent } = await pay(lateBooking.stripeSessionId!);
    await waitFor(async () => (await booking(lateBooking.id)).status === "REFUNDED", 8000, "the late payment to be refunded");

    const refunded = await booking(lateBooking.id);
    expect(refunded.cancelReason).toBe("unavailable");
    expect(refunded.refundAmount).toBe(refunded.amount);
    expect(refundsFor(paymentIntent!)).toHaveLength(1);
    expect((await booking(winning.id)).status).toBe("PAID");
    expect((await slotRow(slot.id)).spotsLeft).toBe(0);
    expect(mail.sent.some((m) => m.template === "booking_cancelled" && m.to === late.email)).toBe(true);
  });

  it("refunds a payment that arrives after the appointment already started", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id);
    const customer = await fx.user();
    const { row } = await checkout(slot.id, customer);
    await prisma.slot.update({ where: { id: slot.id }, data: { startsAt: new Date(Date.now() - 90 * 60_000), endsAt: new Date(Date.now() - 45 * 60_000) } });

    const { paymentIntent } = await pay(row.stripeSessionId!);
    await waitFor(async () => (await booking(row.id)).status === "REFUNDED", 8000, "the too-late refund");
    expect((await booking(row.id)).cancelReason).toBe("paid_too_late");
    expect(refundsFor(paymentIntent!)).toHaveLength(1);
  });

  it("refunds once when the customer cancels twice at the same moment, and frees the spot", async () => {
    const { salon } = await connectedSalon({ cancellationHours: 2 });
    const slot = await fx.slot(salon.id, { startsInMin: 300 });
    const customer = await fx.user();
    const { row } = await checkout(slot.id, customer);
    const { paymentIntent } = await pay(row.stripeSessionId!);
    await waitFor(async () => (await booking(row.id)).status === "PAID", 8000, "payment");

    const actor = { id: customer.id, role: "CUSTOMER" as const };
    const results = await Promise.allSettled([bookings.cancelBooking(row.id, actor), bookings.cancelBooking(row.id, actor)]);
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);

    const after = await booking(row.id);
    expect(after.status).toBe("REFUNDED");
    expect(after.refundAmount).toBe(after.amount);
    expect(after.refundStatus).toBe("SUCCEEDED");
    expect(refundsFor(paymentIntent!)).toHaveLength(1);
    expect((await slotRow(slot.id)).spotsLeft).toBe(1);
    expect((await slotRow(slot.id)).status).toBe("OPEN");
  });

  it("keeps the cancellation window, lets the salon and an admin cancel anyway, and hides bookings from strangers", async () => {
    const { salon, owner } = await connectedSalon({ cancellationHours: 2 });
    const slot = await fx.slot(salon.id, { startsInMin: 60, capacity: 2 });
    const customer = await fx.user();
    const stranger = await fx.user();
    const otherOwner = await fx.user("SALON_OWNER");
    const admin = await fx.user("ADMIN");
    const { row } = await checkout(slot.id, customer);
    await pay(row.stripeSessionId!);
    await waitFor(async () => (await booking(row.id)).status === "PAID", 8000, "payment");

    await expect(bookings.cancelBooking(row.id, { id: stranger.id, role: "CUSTOMER" })).rejects.toMatchObject({ status: 404 });
    await expect(bookings.cancelBooking(row.id, { id: otherOwner.id, role: "SALON_OWNER" })).rejects.toMatchObject({ status: 404 });
    await expect(bookings.checkIn(row.confirmationCode, { id: otherOwner.id, role: "SALON_OWNER" })).rejects.toMatchObject({ status: 404 });
    await expect(bookings.markNoShow(row.id, { id: otherOwner.id, role: "SALON_OWNER" })).rejects.toMatchObject({ status: 404 });
    // One hour before the start, with a two-hour window, the customer can no longer cancel...
    await expect(bookings.cancelBooking(row.id, { id: customer.id, role: "CUSTOMER" })).rejects.toMatchObject({ code: "cancel_window_closed" });
    // ...the salon owner can, and the customer gets the money back.
    const cancelled = await bookings.cancelBooking(row.id, { id: owner.id, role: "SALON_OWNER" });
    expect(cancelled.status).toBe("REFUNDED");
    expect(cancelled.refundAmount).toBe(row.amount);

    const { row: second } = await checkout(slot.id, stranger);
    await pay(second.stripeSessionId!);
    await waitFor(async () => (await booking(second.id)).status === "PAID", 8000, "second payment");
    expect((await bookings.cancelBooking(second.id, { id: admin.id, role: "ADMIN" })).status).toBe("REFUNDED");
  });

  it("withdraws an offer with several bookings: refunds the paid ones, closes the open checkout, retries a failed refund", async () => {
    const { salon, owner } = await connectedSalon();
    const slot = await fx.slot(salon.id, { capacity: 3, startsInMin: 240 });
    const [a, b, c] = [await fx.user(), await fx.user(), await fx.user()];
    const first = await checkout(slot.id, a);
    const second = await checkout(slot.id, b);
    const third = await checkout(slot.id, c);
    const paidA = await pay(first.row.stripeSessionId!);
    const paidB = await pay(second.row.stripeSessionId!);
    await waitFor(async () => (await booking(first.row.id)).status === "PAID" && (await booking(second.row.id)).status === "PAID", 8000, "two payments");

    // The refund for the first customer fails at Stripe (retried by the SDK too), the rest succeed.
    await fetch(`${fake.url}/__control/fail-refunds?times=3`, { method: "POST" });
    const stranger = await fx.user("SALON_OWNER");
    await expect(bookings.cancelSlot(slot.id, { id: stranger.id, role: "SALON_OWNER" })).rejects.toMatchObject({ status: 404 });
    const summary = await bookings.cancelSlot(slot.id, { id: owner.id, role: "SALON_OWNER" });
    expect(summary).toMatchObject({ refunded: 1, failed: 1 });

    expect((await slotRow(slot.id)).status).toBe("CANCELLED");
    // The checkout nobody paid is closed and released.
    expect((await booking(third.row.id)).status).toBe("EXPIRED");
    expect(fake.state.sessions.get(third.row.stripeSessionId!)!.status).toBe("expired");
    // No new customer can book a withdrawn offer.
    await expect(checkout(slot.id, await fx.user())).rejects.toMatchObject({ code: "slot_unavailable" });

    const stillPaid = [await booking(first.row.id), await booking(second.row.id)].filter((x) => x.status === "PAID");
    expect(stillPaid).toHaveLength(1);
    // The cron picks up the leftover and finishes the refund.
    expect(await bookings.retryCancelledSlotRefunds()).toBeGreaterThanOrEqual(1);
    expect((await booking(first.row.id)).status).toBe("REFUNDED");
    expect((await booking(second.row.id)).status).toBe("REFUNDED");
    expect(refundsFor(paidA.paymentIntent!)).toHaveLength(1);
    expect(refundsFor(paidB.paymentIntent!)).toHaveLength(1);
  });

  it("gives an abandoned hold back to the next customer", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id, { capacity: 1 });
    const [a, b] = [await fx.user(), await fx.user()];
    const first = await checkout(slot.id, a);
    await expect(checkout(slot.id, b)).rejects.toMatchObject({ code: "slot_full" });

    await prisma.booking.update({ where: { id: first.row.id }, data: { holdExpiresAt: new Date(Date.now() - 1000) } });
    expect(await bookings.expireStaleHolds()).toBeGreaterThanOrEqual(1);
    expect((await booking(first.row.id)).status).toBe("EXPIRED");
    expect((await slotRow(slot.id)).spotsLeft).toBe(1);
    expect((await checkout(slot.id, b)).row.status).toBe("PENDING");
  });

  it("never sells more spots than exist when many customers book at once", async () => {
    const { salon } = await connectedSalon();
    const slot = await fx.slot(salon.id, { capacity: 3 });
    const customers = await Promise.all(Array.from({ length: 10 }, () => fx.user()));
    const results = await Promise.allSettled(customers.map((c) => checkout(slot.id, c)));
    const winners = results.filter((r) => r.status === "fulfilled");
    expect(winners).toHaveLength(3);
    for (const r of results) if (r.status === "rejected") expect(r.reason).toMatchObject({ code: "slot_full" });
    const after = await slotRow(slot.id);
    expect(after.spotsLeft).toBe(0);
    expect(after.status).toBe("BOOKED");
    expect(await prisma.booking.count({ where: { slotId: slot.id, status: "PENDING" } })).toBe(3);
  });

  it("activates a salon's payouts when Stripe reports the onboarding is complete", async () => {
    const owner = await fx.user("SALON_OWNER");
    const salon = await fx.salon(owner.id);
    const account = await payments.createConnectedAccount(salon, owner.email);
    await prisma.salon.update({ where: { id: salon.id }, data: { stripeAccountId: account.id } });
    expect((await prisma.salon.findUniqueOrThrow({ where: { id: salon.id } })).stripeChargesEnabled).toBe(false);
    // A salon that cannot receive money is not bookable in Stripe mode.
    const slot = await fx.slot(salon.id);
    await expect(checkout(slot.id, await fx.user())).rejects.toMatchObject({ code: "slot_unavailable" });

    await fetch(`${fake.url}/onboard/${account.id}/complete?return=${encodeURIComponent("http://127.0.0.1:1/x")}`, { method: "POST", redirect: "manual" });
    await waitFor(async () => (await prisma.salon.findUniqueOrThrow({ where: { id: salon.id } })).stripeChargesEnabled, 8000, "account.updated");
    const live = await prisma.salon.findUniqueOrThrow({ where: { id: salon.id } });
    expect(live.stripePayoutsEnabled).toBe(true);
    expect((await checkout(slot.id, await fx.user())).row.status).toBe("PENDING");
  });

  it("only lets the cron run with the right secret", async () => {
    const call = (auth?: string) => cronRoute.GET(new Request("http://localhost/api/cron", { headers: auth ? { authorization: auth } : {} }));
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    const ok = await call(`Bearer ${process.env.CRON_SECRET}`);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toHaveProperty("expiredHolds");
  });
});
