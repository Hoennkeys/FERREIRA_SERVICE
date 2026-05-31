import { createServerFn } from "@tanstack/react-start";

import { telemetrySchema } from "../schemas/telemetry";

export const processTelemetry = createServerFn({ method: "POST" })
  .inputValidator(telemetrySchema)
  .handler(async ({ data }) => {
    return { ok: true as const, received: data };
  });
