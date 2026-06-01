import { useSyncExternalStore } from "react";

import { createMockLiveSessionStore } from "./mock-store";
import { createSupabaseLiveSessionStore } from "./supabase-store";
import type { LiveSessionStore } from "./store";
import { INACTIVE_SESSION, type LiveServiceSession } from "./types";

function createStore(): LiveSessionStore {
  const backend = import.meta.env.VITE_LIVE_SESSION_BACKEND;
  if (backend === "supabase") return createSupabaseLiveSessionStore();
  return createMockLiveSessionStore();
}

export const liveSessionStore = createStore();

/**
 * Subscribe to the live session in React. SSR-safe: returns the inactive
 * default on the server and hydrates with the real snapshot on the client.
 */
export function useLiveSession(): LiveServiceSession {
  return useSyncExternalStore(
    (onChange) => liveSessionStore.subscribe(onChange),
    () => liveSessionStore.getSession(),
    () => INACTIVE_SESSION,
  );
}

export { liveSessionStore as store };
export type { LiveSessionStore } from "./store";
export * from "./types";
