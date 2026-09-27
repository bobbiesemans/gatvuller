import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./safe-path";

describe("safeCallbackPath", () => {
  it("keeps a relative path", () => {
    expect(safeCallbackPath("/slots?stad=Antwerpen")).toBe("/slots?stad=Antwerpen");
  });

  it("rejects open redirects", () => {
    expect(safeCallbackPath("https://evil.example")).toBe("/");
    expect(safeCallbackPath("//evil.example")).toBe("/");
    expect(safeCallbackPath("/\\evil.example")).toBe("/");
    expect(safeCallbackPath(null)).toBe("/");
  });
});
