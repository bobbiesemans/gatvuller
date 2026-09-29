import { describe, expect, it, vi } from "vitest";

// Auth.js needs a Next request context; the wrapper is exercised without a session.
vi.mock("./session", () => ({ getCurrentUser: vi.fn(async () => null) }));

const { assertSameOrigin, route } = await import("./api");

const post = (origin?: string, url = "https://gatvuller.example/api/checkout") =>
  new Request(url, { method: "POST", headers: origin ? { origin } : {} });

describe("assertSameOrigin", () => {
  it("lets a request from this site through", () => {
    expect(() => assertSameOrigin(post("https://gatvuller.example"))).not.toThrow();
  });

  it("lets server-to-server calls without an Origin header through", () => {
    expect(() => assertSameOrigin(post())).not.toThrow();
  });

  it("does not check safe methods", () => {
    const get = new Request("https://gatvuller.example/api/health", { method: "GET", headers: { origin: "https://evil.example" } });
    expect(() => assertSameOrigin(get)).not.toThrow();
  });

  it("refuses a state-changing request that names another site", () => {
    expect(() => assertSameOrigin(post("https://evil.example"))).toThrowError(expect.objectContaining({ status: 403, code: "bad_origin" }));
    expect(() => assertSameOrigin(post("https://gatvuller.example.evil.example"))).toThrow();
    expect(() => assertSameOrigin(post("null"))).toThrow();
  });
});

describe("route wrapper", () => {
  it("answers a cross-site POST with 403 before the handler runs", async () => {
    const handler = vi.fn(async () => new Response("done"));
    const res = await route(handler)(post("https://evil.example"), undefined);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "bad_origin" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the handler for a same-site POST", async () => {
    const res = await route(async () => new Response("done"))(post("https://gatvuller.example"), undefined);
    expect(await res.text()).toBe("done");
  });
});
