import { z } from "zod";

export const sessionSummarySchema = z.object({
  total_time_seconds: z.number().int().min(0),
  total_xp_gained: z.number().int().min(0),
});

export const liveServiceSessionSchema = z.object({
  is_active: z.boolean(),
  is_paused: z.boolean(),
  started_at: z.string().datetime().nullable(),
  accumulated_seconds: z.number().int().min(0),
  base_xp_hour: z.number().int().min(0).max(99_999_999),
  last_session_summary: sessionSummarySchema.nullable(),
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type LiveServiceSession = z.infer<typeof liveServiceSessionSchema>;

export const DEFAULT_BASE_XP_HOUR = 80_000;

export const INACTIVE_SESSION: LiveServiceSession = {
  is_active: false,
  is_paused: false,
  started_at: null,
  accumulated_seconds: 0,
  base_xp_hour: DEFAULT_BASE_XP_HOUR,
  last_session_summary: null,
};

export function parseSession(data: unknown): LiveServiceSession | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as Record<string, unknown>;
  const migrated = {
    ...raw,
    is_paused: raw.is_paused ?? false,
    accumulated_seconds: raw.accumulated_seconds ?? 0,
  };

  const result = liveServiceSessionSchema.safeParse(migrated);
  return result.success ? result.data : null;
}
