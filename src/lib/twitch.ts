export const TWITCH_CHANNEL = "ferreiranavoz";

export const TWITCH_URL = `https://www.twitch.tv/${TWITCH_CHANNEL}`;

/** Domínios permitidos no iframe (Twitch exige parâmetro `parent` por host). */
const DEFAULT_PARENT_HOSTS = [
  "localhost",
  "ferreiraservice.vercel.app",
] as const;

export function getTwitchPlayerParents(): string[] {
  const hosts = new Set<string>(DEFAULT_PARENT_HOSTS);

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname) hosts.add(hostname);
  }

  const extra = import.meta.env.VITE_TWITCH_PARENT_HOST?.trim();
  if (extra) hosts.add(extra);

  return [...hosts];
}

export function buildTwitchPlayerSrc(
  parents: string[] = getTwitchPlayerParents(),
): string {
  const params = new URLSearchParams({
    channel: TWITCH_CHANNEL,
    muted: "false",
  });
  for (const host of parents) {
    params.append("parent", host);
  }
  return `https://player.twitch.tv/?${params.toString()}`;
}
