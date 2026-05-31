import { z } from "zod";

export const telemetrySchema = z.object({
  uptime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  xph: z.number().int().min(0).max(99_999_999),
  deaths: z.number().int().min(0).max(9999),
});

export type Telemetry = z.infer<typeof telemetrySchema>;

export function parseTelemetry(data: unknown): Telemetry | null {
  const result = telemetrySchema.safeParse(data);
  return result.success ? result.data : null;
}
