import { afterEach, describe, expect, it } from "vitest";
import { isDemoAccount, isDemoMode } from "./config";

const env = process.env as Record<string, string | undefined>;
const originalNode = env.NODE_ENV;
const originalFlag = env.NEXT_PUBLIC_DEMO_MODE;

afterEach(() => {
  env.NODE_ENV = originalNode;
  if (originalFlag == null) delete env.NEXT_PUBLIC_DEMO_MODE;
  else env.NEXT_PUBLIC_DEMO_MODE = originalFlag;
});

describe("demo mode", () => {
  it("stays off in production unless the flag is explicitly true", () => {
    env.NODE_ENV = "production";
    delete env.NEXT_PUBLIC_DEMO_MODE;
    expect(isDemoMode()).toBe(false);
    env.NEXT_PUBLIC_DEMO_MODE = "true";
    expect(isDemoMode()).toBe(true);
    env.NEXT_PUBLIC_DEMO_MODE = "false";
    expect(isDemoMode()).toBe(false);
  });

  it("recognises seed accounts", () => {
    expect(isDemoAccount("admin@gatvuller.be")).toBe(true);
    expect(isDemoAccount("salon12@gatvuller.be")).toBe(true);
    expect(isDemoAccount("owner@example.com")).toBe(false);
  });
});
