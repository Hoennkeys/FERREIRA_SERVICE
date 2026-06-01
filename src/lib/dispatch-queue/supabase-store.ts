import { supabase } from "../supabase";
import type {
  AddGroupInput,
  DispatchQueueStore,
  QueueListener,
} from "./store";
import { applyClick, expireCooldown, normalizeOrder } from "./logic";
import {
  EMPTY_QUEUE,
  parseQueueState,
  type DispatchQueueState,
  type WhatsAppGroup,
} from "./types";

/**
 * Supabase-backed implementation (single-row JSON document + Realtime).
 *
 * Enable it by setting `VITE_DISPATCH_QUEUE_BACKEND=supabase` and running the
 * SQL below once in the Supabase SQL editor:
 *
 *   create table if not exists public.dispatch_queue (
 *     id text primary key default 'singleton',
 *     groups jsonb not null default '[]'::jsonb,
 *     cooldown jsonb not null default '{"is_active":false,"ends_at":null}'::jsonb,
 *     cooldown_minutes integer not null default 120,
 *     updated_at timestamptz not null default now()
 *   );
 *
 *   insert into public.dispatch_queue (id) values ('singleton')
 *     on conflict (id) do nothing;
 *
 *   alter table public.dispatch_queue enable row level security;
 *
 *   create policy "authenticated can read queue"
 *     on public.dispatch_queue for select
 *     to authenticated using (true);
 *
 *   create policy "authenticated can update queue"
 *     on public.dispatch_queue for update
 *     to authenticated using (true) with check (true);
 *
 *   alter publication supabase_realtime add table public.dispatch_queue;
 */

const TABLE = "dispatch_queue";
const ROW_ID = "singleton";

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return EMPTY_QUEUE.cooldown_minutes;
  return Math.min(Math.max(Math.floor(value), 1), 1440);
}

class SupabaseDispatchQueueStore implements DispatchQueueStore {
  private state: DispatchQueueState = EMPTY_QUEUE;
  private listeners = new Set<QueueListener>();
  private subscribed = false;

  private setLocal(next: DispatchQueueState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
  }

  private async fetchInitial() {
    const { data } = await supabase
      .from(TABLE)
      .select("groups, cooldown, cooldown_minutes")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (data) {
      const parsed = parseQueueState(data) ?? EMPTY_QUEUE;
      this.setLocal(expireCooldown(parsed));
    }
  }

  private ensureRealtime() {
    if (this.subscribed || typeof window === "undefined") return;
    this.subscribed = true;

    void this.fetchInitial();

    supabase
      .channel("dispatch_queue_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          const next = parseQueueState(payload.new);
          if (next) this.setLocal(expireCooldown(next));
        },
      )
      .subscribe();
  }

  getState(): DispatchQueueState {
    this.ensureRealtime();
    const expired = expireCooldown(this.state);
    if (expired !== this.state) void this.upsert(expired);
    return this.state;
  }

  subscribe(listener: QueueListener): () => void {
    this.ensureRealtime();
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async upsert(next: DispatchQueueState) {
    this.setLocal(next);
    const { error } = await supabase.from(TABLE).upsert({
      id: ROW_ID,
      groups: next.groups,
      cooldown: next.cooldown,
      cooldown_minutes: next.cooldown_minutes,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("[dispatch-queue] supabase upsert failed", error);
  }

  async addGroup({ name, url }: AddGroupInput): Promise<void> {
    const maxOrder = this.state.groups.reduce(
      (max, g) => Math.max(max, g.order),
      -1,
    );
    const group: WhatsAppGroup = {
      id: crypto.randomUUID(),
      name,
      url,
      flyer_clicked: false,
      text_clicked: false,
      order: maxOrder + 1,
    };
    await this.upsert({
      ...this.state,
      groups: normalizeOrder([...this.state.groups, group]),
    });
  }

  async removeGroup(id: string): Promise<void> {
    await this.upsert({
      ...this.state,
      groups: normalizeOrder(this.state.groups.filter((g) => g.id !== id)),
    });
  }

  async markFlyer(id: string): Promise<void> {
    await this.upsert(applyClick(this.state, id, "flyer_clicked"));
  }

  async markText(id: string): Promise<void> {
    await this.upsert(applyClick(this.state, id, "text_clicked"));
  }

  async setCooldownMinutes(minutes: number): Promise<void> {
    await this.upsert({ ...this.state, cooldown_minutes: clampMinutes(minutes) });
  }

  async cancelCooldown(): Promise<void> {
    await this.upsert({
      ...this.state,
      cooldown: { is_active: false, ends_at: null },
    });
  }
}

export function createSupabaseDispatchQueueStore(): DispatchQueueStore {
  return new SupabaseDispatchQueueStore();
}
