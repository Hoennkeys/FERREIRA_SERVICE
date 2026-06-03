import { createServerFn } from "@tanstack/react-start";

import { getTwitchLiveStatus } from "../twitch.server";

/** Consulta a API Helix da Twitch (server-only; credenciais em TWITCH_CLIENT_*). */
export const checkTwitchLive = createServerFn({ method: "GET" }).handler(
  async () => getTwitchLiveStatus(),
);
