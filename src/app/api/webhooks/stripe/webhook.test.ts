import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("stripe webhook", () => {
  it("does not accept an unsigned payload", async () => {
    const res = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));
    expect(res.status).not.toBe(200);
    const body = await res.json();
    expect(body.received).toBeUndefined();
  });
});
