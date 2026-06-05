import { useEffect, useState } from "react";

const CHANNEL = "ferreiranavoz";
const POLL_INTERVAL_MS = 60_000;
const OFFLINE_MARKER = "is offline";

async function fetchIsLive(signal: AbortSignal): Promise<boolean | null> {
  try {
    const res = await fetch(`https://decapi.me/twitch/uptime/${CHANNEL}`, {
      signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const normalized = (await res.text()).trim().toLowerCase();
    return !normalized.includes(OFFLINE_MARKER);
  } catch {
    return null;
  }
}

export function useTwitchStatus() {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const check = async () => {
      const result = await fetchIsLive(controller.signal);
      if (result !== null) {
        setIsLive(result);
      }
      setLoading(false);
    };

    check();
    const timer = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  return { isLive, loading };
}
