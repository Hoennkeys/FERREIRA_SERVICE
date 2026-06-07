/** Destino padrão após login bem-sucedido. */
export const DEFAULT_AUTH_REDIRECT = "/dispatch";

/** Prefixos de path permitidos no parâmetro `?redirect=`. */
const ALLOWED_AUTH_PREFIXES = ["/dispatch"] as const;

/**
 * Sanitiza redirect pós-login contra open redirect.
 * Aceita apenas paths internos na allowlist (ex.: /dispatch).
 */
export function sanitizeRedirectPath(input: string | undefined | null): string {
  if (!input || typeof input !== "string") {
    return DEFAULT_AUTH_REDIRECT;
  }

  const trimmed = input.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }
  if (/[\s\\]/.test(trimmed)) {
    return DEFAULT_AUTH_REDIRECT;
  }
  // Bloqueia /javascript: e esquemas embutidos no path
  if (/^\/[^/]*:/i.test(trimmed)) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.includes("://") || decoded.startsWith("//")) {
      return DEFAULT_AUTH_REDIRECT;
    }
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }

  const allowed = ALLOWED_AUTH_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`),
  );
  if (!allowed) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return trimmed;
}
