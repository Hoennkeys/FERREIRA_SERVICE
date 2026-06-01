import type { LiveServiceSession } from "./types";

export type StartSessionInput = {
  baseXpHour: number;
};

export type SessionListener = (session: LiveServiceSession) => void;

/**
 * Backend-agnostic contract for reading/writing the live service session.
 * Implemented by the mock (localStorage + BroadcastChannel) and by Supabase.
 */
export interface LiveSessionStore {
  /** Current snapshot (sync). Returns the inactive default until hydrated. */
  getSession(): LiveServiceSession;
  /** Subscribe to changes. Returns an unsubscribe function. */
  subscribe(listener: SessionListener): () => void;
  /** Starts the service: is_active=true, started_at=now, base_xp_hour saved. */
  startSession(input: StartSessionInput): Promise<void>;
  /** Freezes the timer while keeping the session active. */
  pauseSession(): Promise<void>;
  /** Resumes a paused session from the frozen elapsed time. */
  resumeSession(): Promise<void>;
  /** Zeros uptime/XP while keeping the session active (or paused). */
  resetSession(): Promise<void>;
  /** Ends the service: is_active=false and writes last_session_summary. */
  endSession(): Promise<void>;
}
