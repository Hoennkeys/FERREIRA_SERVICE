import { useEffect, useState } from "react";

import { dispatchQueueStore } from "@/lib/dispatch-queue";

export type CooldownTick = {
  remainingSeconds: number;
  clock: string;
  isExpired: boolean;
};

function formatClock(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function compute(endsAt: string | null): CooldownTick {
  if (!endsAt) {
    return { remainingSeconds: 0, clock: "00:00:00", isExpired: true };
  }
  const end = new Date(endsAt).getTime();
  const remainingMs = Number.isNaN(end) ? 0 : end - Date.now();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return {
    remainingSeconds,
    clock: formatClock(remainingSeconds),
    isExpired: remainingSeconds <= 0,
  };
}

/**
 * Countdown for the dispatch cooldown computed from the persisted `ends_at`,
 * so it survives refreshes and stays in sync across tabs. When it reaches
 * zero it clears the cooldown lock in the store, releasing the UI.
 */
export function useCooldownTimer(endsAt: string | null): CooldownTick {
  const [tick, setTick] = useState<CooldownTick>(() => compute(endsAt));

  useEffect(() => {
    const next = compute(endsAt);
    setTick(next);

    if (!endsAt || next.isExpired) {
      if (endsAt && next.isExpired) {
        void dispatchQueueStore.cancelCooldown();
      }
      return;
    }

    const id = setInterval(() => {
      const current = compute(endsAt);
      setTick(current);
      if (current.isExpired) {
        clearInterval(id);
        void dispatchQueueStore.cancelCooldown();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [endsAt]);

  return tick;
}
