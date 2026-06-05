import { createServerFn } from "@tanstack/react-start";

import { telemetrySchema } from "../schemas/telemetry";
import { assertServerFnRateLimit } from "../security/server-fn-guard.server";

const TELEMETRY_FN_RATE = { max: 120, windowMs: 60_000 };

export const processTelemetry = createServerFn({ method: "POST" })
  .inputValidator(telemetrySchema)
  .handler(async ({ data }) => {
    try {
      assertServerFnRateLimit("telemetry", TELEMETRY_FN_RATE);
    } catch {
      return { ok: false as const, error: "rate_limited" as const };
    }
    return { ok: true as const, received: data };
  });
