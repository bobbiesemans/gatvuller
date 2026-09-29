/**
 * Belgian company number (KBO/BCE): ten digits, starting with 0 or 1, whose last two digits are a
 * modulo-97 check on the first eight. Optional "BE" prefix, dots and spaces are ignored.
 * A valid checksum only proves the number is well formed; an admin still checks it in the register.
 */
export function normalizeBusinessNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.trim().replace(/^BE/i, "").replace(/[\s.\-]/g, "");
  if (!/^[01]\d{9}$/.test(digits)) return null;
  const check = 97 - (Number(digits.slice(0, 8)) % 97);
  if (check !== Number(digits.slice(8))) return null;
  return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
}
