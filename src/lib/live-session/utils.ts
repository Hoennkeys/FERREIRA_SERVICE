import type { LiveServiceSession } from "./types";

/** Total elapsed milliseconds for an active or paused session. */
export function getElapsedMs(
  session: Pick<
    LiveServiceSession,
    "is_active" | "is_paused" | "started_at" | "accumulated_seconds"
  >,
  now = Date.now(),
): number {
  if (!session.is_active) return 0;

  let ms = session.accumulated_seconds * 1000;

  if (!session.is_paused && session.started_at) {
    const start = new Date(session.started_at).getTime();
    if (!Number.isNaN(start)) {
      ms += Math.max(0, now - start);
    }
  }

  return ms;
}

export function getElapsedSeconds(
  session: Pick<
    LiveServiceSession,
    "is_active" | "is_paused" | "started_at" | "accumulated_seconds"
  >,
  now = Date.now(),
): number {
  return Math.floor(getElapsedMs(session, now) / 1000);
}

export function computeXpFromElapsed(elapsedMs: number, baseXpHour: number): number {
  return Math.floor((elapsedMs / 3_600_000) * baseXpHour);
}
