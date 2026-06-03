import { useQuery } from "@tanstack/react-query";

import { checkTwitchLive } from "@/lib/api/twitch.functions";

const POLL_MS = 45_000;

export function useTwitchLive() {
  return useQuery({
    queryKey: ["twitch-live"],
    queryFn: () => checkTwitchLive(),
    refetchInterval: POLL_MS,
    staleTime: 30_000,
    retry: 1,
  });
}
