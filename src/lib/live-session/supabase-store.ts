import { supabase } from "../supabase";
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

/**
 * Supabase-backed implementation (single-row table + Realtime).
 *
 * Enable it by setting `VITE_LIVE_SESSION_BACKEND=supabase` and running the
 * SQL below once in the Supabase SQL editor:
 *
 *   create table if not exists public.live_service_session (
 *     id text primary key default 'singleton',
 *     is_active boolean not null default false,
 *     is_paused boolean not null default false,
 *     started_at timestamptz,
 *     accumulated_seconds integer not null default 0,
 *     base_xp_hour integer not null default 80000,
 *     last_session_summary jsonb,
 *     updated_at timestamptz not null default now()
 *   );
 *
 *   insert into public.live_service_session (id) values ('singleton')
 *     on conflict (id) do nothing;
 *
 *   -- migration for existing installs
 *   alter table public.live_service_session
 *     add column if not exists is_paused boolean not null default false,
 *     add column if not exists accumulated_seconds integer not null default 0;
 *
 *   alter table public.live_service_session enable row level security;
 *
 *   create policy "anon can read session"
 *     on public.live_service_session for select
 *     to anon, authenticated using (true);
 *
 *   create policy "live_session_update_admin"
 *     on public.live_service_session for update
 *     to authenticated using (public.is_admin()) with check (public.is_admin());
 *   -- Após Fase 1: execute supabase/migrations/security_phase2_hardening.sql
 *
 *   -- expose the table to Realtime
 *   alter publication supabase_realtime add table public.live_service_session;
 */

const TABLE = "live_service_session";
const ROW_ID = "singleton";

type Row = {
  is_active: boolean;
  is_paused: boolean;
  started_at: string | null;
  accumulated_seconds: number;
  base_xp_hour: number;
  last_session_summary: LiveServiceSession["last_session_summary"];
};

function rowToSession(row: Row | null): LiveServiceSession {
  return parseSession(row) ?? INACTIVE_SESSION;
}

function clampXpHour(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value), 99_999_999);
}

class SupabaseLiveSessionStore implements LiveSessionStore {
  private session: LiveServiceSession = INACTIVE_SESSION;
  private listeners = new Set<SessionListener>();
  private subscribed = false;

  private setLocal(next: LiveServiceSession) {
    this.session = next;
    this.listeners.forEach((listener) => listener(next));
  }

  private async fetchInitial() {
    const { data } = await supabase
      .from(TABLE)
      .select(
        "is_active, is_paused, started_at, accumulated_seconds, base_xp_hour, last_session_summary",
      )
      .eq("id", ROW_ID)
      .maybeSingle();
    if (data) this.setLocal(rowToSession(data as Row));
  }

  private ensureRealtime() {
    if (this.subscribed || typeof window === "undefined") return;
    this.subscribed = true;

    void this.fetchInitial();

    supabase
      .channel("live_service_session_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          const next = parseSession(payload.new);
          if (next) this.setLocal(next);
        },
      )
      .subscribe();
  }

  getSession(): LiveServiceSession {
    this.ensureRealtime();
    return this.session;
  }

  subscribe(listener: SessionListener): () => void {
    this.ensureRealtime();
    this.listeners.add(listener);
    listener(this.session);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async upsert(next: LiveServiceSession) {
    this.setLocal(next);
    const { error } = await supabase.from(TABLE).upsert({
      id: ROW_ID,
      ...next,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("[live-session] supabase upsert failed", error);
  }

  async startSession({ baseXpHour }: StartSessionInput): Promise<void> {
    await this.upsert({
      is_active: true,
      is_paused: false,
      started_at: new Date().toISOString(),
      accumulated_seconds: 0,
      base_xp_hour: clampXpHour(baseXpHour),
      last_session_summary: this.session.last_session_summary,
    });
  }

  async pauseSession(): Promise<void> {
    const current = this.session;
    if (!current.is_active || current.is_paused) return;

    await this.upsert({
      ...current,
      is_paused: true,
      accumulated_seconds: getElapsedSeconds(current),
      started_at: null,
    });
  }

  async resumeSession(): Promise<void> {
    const current = this.session;
    if (!current.is_active || !current.is_paused) return;

    await this.upsert({
      ...current,
      is_paused: false,
      started_at: new Date().toISOString(),
    });
  }

  async resetSession(): Promise<void> {
    const current = this.session;
    if (!current.is_active) return;

    await this.upsert({
      ...current,
      accumulated_seconds: 0,
      started_at: current.is_paused ? null : new Date().toISOString(),
    });
  }

  async endSession(): Promise<void> {
    const current = this.session;
    const totalSeconds = getElapsedSeconds(current);
    const totalXp = Math.floor((totalSeconds / 3600) * current.base_xp_hour);

    await this.upsert({
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

export function createSupabaseLiveSessionStore(): LiveSessionStore {
  return new SupabaseLiveSessionStore();
}
