import { describe, expect, it } from "vitest";
import nl from "../../messages/nl.json";
import fr from "../../messages/fr.json";
import en from "../../messages/en.json";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe("message catalogs", () => {
  it("uses the same keys in Dutch, French and English", () => {
    const dutch = leafKeys(nl).sort();
    expect(leafKeys(fr).sort()).toEqual(dutch);
    expect(leafKeys(en).sort()).toEqual(dutch);
    expect(dutch.some((key) => key.startsWith("ui."))).toBe(true);
    expect(dutch.some((key) => key.startsWith("emails."))).toBe(true);
  });
});
