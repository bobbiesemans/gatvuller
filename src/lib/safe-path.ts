/**
 * Only same-site relative paths. URL parsers drop tabs and newlines, so "/\t/evil.com" would become
 * "//evil.com"; any control character, whitespace or backslash is therefore refused outright.
 */
export function safeCallbackPath(value: string | null | undefined, fallback = "/") {
  if (!value) return fallback;
  if (/[\u0000-\u001F\u007F\s\\]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  const base = "http://gatvuller.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
