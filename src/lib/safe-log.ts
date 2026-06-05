/**
 * Logging seguro isomórfico (SSR + client).
 * Sem imports server-only, process.env ou APIs de Node — seguro em boundaries React.
 */

const REDACTED_KEYS = new Set([
  "password",
  "token",
  "whatsapp",
  "discord",
  "nome",
  "char_nome",
  "authorization",
  "access_token",
  "refresh_token",
  "claim_token",
]);

function extractErrorFields(error: unknown): Record<string, string> {
  if (error == null) return { message: "unknown error" };
  if (typeof error === "string") return { message: error };
  if (error instanceof Error) {
    const out: Record<string, string> = { message: error.message, name: error.name };
    const code = (error as Error & { code?: string }).code;
    if (code) out.code = code;
    return out;
  }
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const out: Record<string, string> = {};
    if (typeof obj.message === "string") out.message = obj.message;
    if (typeof obj.name === "string") out.name = obj.name;
    if (typeof obj.code === "string") out.code = obj.code;
    return Object.keys(out).length > 0 ? out : { message: "non-error thrown" };
  }
  return { message: String(error) };
}

/** Log seguro para produção — sem PII, stack nem tokens completos. */
export function safeError(context: string, error: unknown): void {
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(`[${context}]`, extractErrorFields(error));
  }
}

/** Redige chaves sensíveis de objetos antes de log (uso pontual). */
export function redactForLog<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : value;
  }
  return out;
}
