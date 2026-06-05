import type { TwitchLiveStatus } from "../twitch.types";

/** Cache global da resposta Helix — uma consulta atende todos os visitantes no intervalo. */
const TWITCH_CACHE_TTL_MS = 45_000;

let cache: { data: TwitchLiveStatus; expiresAt: number } | null = null;

export function getCachedTwitchLive(): TwitchLiveStatus | null {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data;
  }
  return null;
}

export function setCachedTwitchLive(data: TwitchLiveStatus): void {
  cache = { data, expiresAt: Date.now() + TWITCH_CACHE_TTL_MS };
}
