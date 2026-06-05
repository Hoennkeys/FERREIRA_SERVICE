import { checkRateLimit, type RateLimitOptions } from "./rate-limit.server";
import { getRequestClientIp } from "./request-context.server";

export function assertServerFnRateLimit(
  namespace: string,
  options: RateLimitOptions,
): void {
  const ip = getRequestClientIp();
  const result = checkRateLimit(`${namespace}:${ip}`, options);
  if (!result.ok) {
    throw new Error("rate_limited");
  }
}
