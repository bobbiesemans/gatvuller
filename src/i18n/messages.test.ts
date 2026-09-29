import { describe, expect, it } from "vitest";
import { AREA_FILES, catalogFor } from "./catalog";
import { locales } from "./config";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe("message catalogs", () => {
  it("uses the same keys in Dutch, French and English", () => {
    const dutch = leafKeys(catalogFor("nl")).sort();
    expect(leafKeys(catalogFor("fr")).sort()).toEqual(dutch);
    expect(leafKeys(catalogFor("en")).sort()).toEqual(dutch);
    expect(dutch.some((key) => key.startsWith("ui."))).toBe(true);
    expect(dutch.some((key) => key.startsWith("emails."))).toBe(true);
  });

  it("defines every key path in exactly one file per language", () => {
    for (const locale of locales) {
      const seen = new Map<string, string>();
      for (const [file, tree] of Object.entries(AREA_FILES[locale])) {
        for (const key of leafKeys(tree)) {
          if (!key) continue;
          const other = seen.get(key);
          expect(other, `${locale}: "${key}" is defined in both ${other} and ${file}`).toBeUndefined();
          seen.set(key, file);
        }
      }
    }
  });

  it("has no empty translations", () => {
    for (const locale of locales) {
      const catalog = catalogFor(locale);
      const empty = leafKeys(catalog).filter((key) => {
        const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalog);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empty, `${locale} has empty strings`).toEqual([]);
    }
  });
});
