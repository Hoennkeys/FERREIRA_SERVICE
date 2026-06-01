import { useSyncExternalStore } from "react";

import { createMockDispatchQueueStore } from "./mock-store";
import { createSupabaseDispatchQueueStore } from "./supabase-store";
import type { DispatchQueueStore } from "./store";
import { EMPTY_QUEUE, type DispatchQueueState } from "./types";

function createStore(): DispatchQueueStore {
  const backend = import.meta.env.VITE_DISPATCH_QUEUE_BACKEND;
  if (backend === "supabase") return createSupabaseDispatchQueueStore();
  return createMockDispatchQueueStore();
}

export const dispatchQueueStore = createStore();

/**
 * Subscribe to the dispatch queue in React. SSR-safe: returns the empty
 * default on the server and hydrates with the real snapshot on the client.
 */
export function useDispatchQueue(): DispatchQueueState {
  return useSyncExternalStore(
    (onChange) => dispatchQueueStore.subscribe(onChange),
    () => dispatchQueueStore.getState(),
    () => EMPTY_QUEUE,
  );
}

export { dispatchQueueStore as store };
export type { DispatchQueueStore } from "./store";
export * from "./types";
