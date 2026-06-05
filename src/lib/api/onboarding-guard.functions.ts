import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { checkRateLimit } from "../security/rate-limit.server";
import { getRequestClientIp } from "../security/request-context.server";
import {
  isTurnstileConfigured,
  verifyTurnstileToken,
} from "../security/turnstile.server";

const ONBOARDING_RATE = { max: 8, windowMs: 15 * 60 * 1000 };
/** Sem Turnstile: limite mais rígido no app (DB também limita na RPC). */
const ONBOARDING_STRICT_RATE = { max: 3, windowMs: 30 * 60 * 1000 };

export type OnboardingGateReason =
  | "rate_limited"
  | "captcha_required"
  | "captcha_failed"
  | "bot_detected";

export type OnboardingGateResult =
  | { ok: true }
  | { ok: false; reason: OnboardingGateReason };

/** Rate limit + Turnstile antes de criar pedido na homepage. */
export const verifyOnboardingGate = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      turnstileToken: z.string().min(1).optional(),
      /** Honeypot — deve permanecer vazio. */
      website: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }): Promise<OnboardingGateResult> => {
    if (data.website?.trim()) {
      return { ok: false, reason: "bot_detected" };
    }

    const ip = getRequestClientIp();
    const rate = checkRateLimit(`onboarding:${ip}`, ONBOARDING_RATE);
    if (!rate.ok) {
      return { ok: false, reason: "rate_limited" };
    }

    if (!isTurnstileConfigured()) {
      const strict = checkRateLimit(
        `onboarding-strict:${ip}`,
        ONBOARDING_STRICT_RATE,
      );
      if (!strict.ok) {
        return { ok: false, reason: "rate_limited" };
      }
      return { ok: true };
    }

    const token = data.turnstileToken?.trim();
    if (!token) {
      return { ok: false, reason: "captcha_required" };
    }

    const valid = await verifyTurnstileToken(token, ip);
    if (!valid) {
      return { ok: false, reason: "captcha_failed" };
    }

    return { ok: true };
  });
