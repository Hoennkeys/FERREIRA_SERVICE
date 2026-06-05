import type {
  LiveSessionStore,
  SessionListener,
  StartSessionInput,
} from "./store";
import { getElapsedSeconds } from "./utils";
import {
  INACTIVE_SESSION,
  parseSession,
  type LiveServiceSession,
} from "./types";

const STORAGE_KEY = "ferreira-live-session";
const CHANNEL_NAME = "ferreira-live-session";

function clampXpHour(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value), 99_999_999);
}

/**
 * Mock backend that persists the session in localStorage and broadcasts
 * changes to other tabs via BroadcastChannel (with a `storage` event
 * fallback). Lets the admin panel and the public client view stay in sync
 * within the same browser without any external service.
 */
class MockLiveSessionStore implements LiveSessionStore {
  private session: LiveServiceSession = INACTIVE_SESSION;
  private listeners = new Set<SessionListener>();
  private channel: BroadcastChannel | null = null;
  private initialized = false;

  private ensureClientInit() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    this.session = this.readFromStorage();

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        const next = parseSession(event.data);
        if (next) this.setLocal(next);
      };
    }

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = parseSession(JSON.parse(event.newValue));
        if (next) this.setLocal(next);
      } catch {
        /* ignore malformed payloads */
      }
    });
  }

  private readFromStorage(): LiveServiceSession {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return INACTIVE_SESSION;
      return parseSession(JSON.parse(raw)) ?? INACTIVE_SESSION;
    } catch {
      return INACTIVE_SESSION;
    }
  }

  private setLocal(next: LiveServiceSession) {
    this.session = next;
    this.listeners.forEach((listener) => listener(next));
  }

  private persistAndBroadcast(next: LiveServiceSession) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota/availability errors */
    }
    this.channel?.postMessage(next);
  }

  private commit(next: LiveServiceSession) {
    this.setLocal(next);
    this.persistAndBroadcast(next);
  }

  getSession(): LiveServiceSession {
    this.ensureClientInit();
    return this.session;
  }

  subscribe(listener: SessionListener): () => void {
    this.ensureClientInit();
    this.listeners.add(listener);
    listener(this.session);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async startSession({ baseXpHour }: StartSessionInput): Promise<void> {
    this.ensureClientInit();
    this.commit({
      is_active: true,
      is_paused: false,
      started_at: new Date().toISOString(),
      accumulated_seconds: 0,
      base_xp_hour: clampXpHour(baseXpHour),
      last_session_summary: this.session.last_session_summary,
    });
  }

  async pauseSession(): Promise<void> {
    this.ensureClientInit();
    const current = this.session;
    if (!current.is_active || current.is_paused) return;

    this.commit({
      ...current,
      is_paused: true,
      accumulated_seconds: getElapsedSeconds(current),
      started_at: null,
    });
  }

  async resumeSession(): Promise<void> {
    this.ensureClientInit();
    const current = this.session;
    if (!current.is_active || !current.is_paused) return;

    this.commit({
      ...current,
      is_paused: false,
      started_at: new Date().toISOString(),
    });
  }

  async resetSession(): Promise<void> {
    this.ensureClientInit();
    const current = this.session;
    if (!current.is_active) return;

    this.commit({
      ...current,
      accumulated_seconds: 0,
      started_at: current.is_paused ? null : new Date().toISOString(),
    });
  }

  async endSession(): Promise<void> {
    this.ensureClientInit();
    const current = this.session;
    const totalSeconds = getElapsedSeconds(current);
    const totalXp = Math.floor((totalSeconds / 3600) * current.base_xp_hour);

    this.commit({
      is_active: false,
      is_paused: false,
      started_at: null,
      accumulated_seconds: 0,
      base_xp_hour: current.base_xp_hour,
      last_session_summary: {
        total_time_seconds: totalSeconds,
        total_xp_gained: totalXp,
      },
    });
  }
}

export function createMockLiveSessionStore(): LiveSessionStore {
  return new MockLiveSessionStore();
}
