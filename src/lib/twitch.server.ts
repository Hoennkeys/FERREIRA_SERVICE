import process from "node:process";

import { TWITCH_CHANNEL } from "./twitch";
import type { TwitchLiveStatus } from "./twitch.types";

let cachedToken: { token: string; expiresAt: number } | null = null;

function getCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function getAppAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(0, data.expires_in - 120) * 1000,
  };
  return cachedToken.token;
}

export async function getTwitchLiveStatus(): Promise<TwitchLiveStatus> {
  const creds = getCredentials();
  if (!creds) {
    return { configured: false, isLive: false, error: "missing_credentials" };
  }

  const token = await getAppAccessToken(creds.clientId, creds.clientSecret);
  if (!token) {
    return { configured: true, isLive: false, error: "token_failed" };
  }

  const url = new URL("https://api.twitch.tv/helix/streams");
  url.searchParams.set("user_login", TWITCH_CHANNEL);

  const res = await fetch(url, {
    headers: {
      "Client-Id": creds.clientId,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return { configured: true, isLive: false, error: "api_failed" };
  }

  const body = (await res.json()) as {
    data: Array<{ title: string; viewer_count: number }>;
  };
  const stream = body.data?.[0];

  return {
    configured: true,
    isLive: Boolean(stream),
    title: stream?.title,
    viewerCount: stream?.viewer_count,
  };
}
