import { describe, expect, it } from "vitest";
import { jsonLd } from "./json-ld";

describe("jsonLd", () => {
  it("cannot close the script tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
