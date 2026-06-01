import { useEffect, useRef, useState } from "react";

import type { LiveServiceSession } from "@/lib/live-session/types";
import { computeXpFromElapsed, getElapsedMs } from "@/lib/live-session/utils";

export type TelemetryTick = {
  elapsedSeconds: number;
  uptime: string;
  xp: number;
  xpFormatted: string;
};

const xpFormatter = new Intl.NumberFormat("pt-BR");

function formatUptime(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

type TimerSession = Pick<
  LiveServiceSession,
  "is_active" | "is_paused" | "started_at" | "accumulated_seconds" | "base_xp_hour"
>;

function compute(session: TimerSession): TelemetryTick {
  if (!session.is_active) {
    return { elapsedSeconds: 0, uptime: "00:00:00", xp: 0, xpFormatted: "0" };
  }

  const elapsedMs = getElapsedMs(session);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const xp = computeXpFromElapsed(elapsedMs, session.base_xp_hour);

  return {
    elapsedSeconds,
    uptime: formatUptime(elapsedSeconds),
    xp,
    xpFormatted: xpFormatter.format(xp),
  };
}

/**
 * Drives the live uptime/XP readout from the session timestamps.
 * Uses requestAnimationFrame while the session is running; freezes when
 * paused or inactive.
 */
export function useTelemetryTimer(session: TimerSession): TelemetryTick {
  const [tick, setTick] = useState<TelemetryTick>(() => compute(session));
  const lastXpRef = useRef<number>(tick.xp);

  const isRunning =
    session.is_active && !session.is_paused && session.started_at != null;

  useEffect(() => {
    if (!isRunning) {
      const frozen = compute(session);
      lastXpRef.current = frozen.xp;
      setTick(frozen);
      return;
    }

    let frame = 0;
    let cancelled = false;

    const loop = () => {
      if (cancelled) return;
      const next = compute(session);
      if (next.xp !== lastXpRef.current) {
        lastXpRef.current = next.xp;
        setTick(next);
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [
    isRunning,
    session.is_active,
    session.is_paused,
    session.started_at,
    session.accumulated_seconds,
    session.base_xp_hour,
  ]);

  return tick;
}
