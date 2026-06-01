import type { DispatchQueueState } from "./types";

export type AddGroupInput = {
  name: string;
  url: string;
};

export type QueueListener = (state: DispatchQueueState) => void;

/**
 * Backend-agnostic contract for the WhatsApp dispatch queue.
 * Implemented by the mock (localStorage + BroadcastChannel) and by Supabase.
 */
export interface DispatchQueueStore {
  /** Current snapshot (sync). Auto-expires the cooldown when read. */
  getState(): DispatchQueueState;
  /** Subscribe to changes. Returns an unsubscribe function. */
  subscribe(listener: QueueListener): () => void;
  addGroup(input: AddGroupInput): Promise<void>;
  removeGroup(id: string): Promise<void>;
  /** Marks the flyer as dispatched for a group (rotates when protocol done). */
  markFlyer(id: string): Promise<void>;
  /** Marks the text as dispatched for a group (rotates when protocol done). */
  markText(id: string): Promise<void>;
  /** Sets the configurable cooldown duration in minutes. */
  setCooldownMinutes(minutes: number): Promise<void>;
  /** Manually clears the cooldown lock. */
  cancelCooldown(): Promise<void>;
}
