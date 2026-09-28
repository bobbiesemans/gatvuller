/**
 * Structured logging that never writes personal data or secrets.
 * Callers pass ids and codes; anything that still looks like an e-mail address, a key or a token is masked.
 */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SECRET = /\b(?:sk|rk|pk|whsec)_(?:test|live)_[A-Za-z0-9]+|\bwhsec_[A-Za-z0-9]+|\bre_[A-Za-z0-9_]{12,}|Bearer\s+[A-Za-z0-9._~+/-]+=*/g;
const URL_SECRET = /([?&](?:t|token|session_id|code)=)[^&\s"']+/gi;
const POSTGRES = /postgres(?:ql)?:\/\/[^\s"']+/gi;

export function scrubText(value: string) {
  return value
    .replace(POSTGRES, "postgresql://[redacted]")
    .replace(SECRET, "[secret]")
    .replace(EMAIL, "[email]")
    .replace(URL_SECRET, "$1[redacted]")
    .slice(0, 800);
}

function describeError(err: unknown) {
  if (err instanceof Error) {
    const withCode = err as Error & { code?: unknown; type?: unknown; statusCode?: unknown };
    return {
      name: err.name,
      message: scrubText(err.message),
      ...(typeof withCode.code === "string" ? { code: withCode.code } : {}),
      ...(typeof withCode.type === "string" ? { type: withCode.type } : {}),
      ...(typeof withCode.statusCode === "number" ? { status: withCode.statusCode } : {}),
    };
  }
  return { message: scrubText(String(err)) };
}

function clean(fields: Record<string, unknown> | undefined) {
  if (!fields) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (key === "error" || value instanceof Error) out[key] = describeError(value);
    else if (typeof value === "string") out[key] = scrubText(value);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) out[key] = value;
    else out[key] = scrubText(JSON.stringify(value) ?? "");
  }
  return out;
}

function write(level: "info" | "warn" | "error", event: string, fields?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level === "info") return;
  const line = JSON.stringify({ level, event, ...clean(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};
