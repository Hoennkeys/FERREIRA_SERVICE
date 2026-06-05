import { createServerFn } from "@tanstack/react-start";

import { assertServerFnRateLimit } from "../security/server-fn-guard.server";
import {
  getCachedTwitchLive,
  setCachedTwitchLive,
} from "../security/twitch-cache.server";
import { getTwitchLiveStatus } from "../twitch.server";

const TWITCH_FN_RATE = { max: 60, windowMs: 60_000 };

/** Consulta a API Helix da Twitch (server-only; credenciais em TWITCH_CLIENT_*). */
export const checkTwitchLive = createServerFn({ method: "GET" }).handler(async () => {
  try {
    assertServerFnRateLimit("twitch-live", TWITCH_FN_RATE);
  } catch {
    return { configured: true, isLive: false, error: "rate_limited" as const };
  }

  const cached = getCachedTwitchLive();
  if (cached) return cached;

  const status = await getTwitchLiveStatus();
  if (status.configured && !status.error) {
    setCachedTwitchLive(status);
  }
  return status;
});
