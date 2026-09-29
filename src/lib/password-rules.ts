import { z } from "zod";

/** Shown next to every password field and enforced by the API routes. bcrypt only reads the first 72 bytes. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, { message: "too_long" });
