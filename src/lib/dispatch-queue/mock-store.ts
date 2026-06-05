import type { AddGroupInput, DispatchQueueStore, QueueListener } from "./store";
import { applyClick, expireCooldown, normalizeOrder } from "./logic";
import {
  EMPTY_QUEUE,
  parseQueueState,
  type DispatchQueueState,
  type WhatsAppGroup,
} from "./types";

const STORAGE_KEY = "ferreira-dispatch-queue";
const CHANNEL_NAME = "ferreira-dispatch-queue";
const LEGACY_GROUPS_KEY = "ferreira-dispatch-groups";

type LegacyGroup = { id: string; name: string; link: string };

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return EMPTY_QUEUE.cooldown_minutes;
  return Math.min(Math.max(Math.floor(value), 1), 1440);
}

/**
 * Mock backend that persists the dispatch queue in localStorage and broadcasts
 * changes to other tabs via BroadcastChannel (with a `storage` event fallback).
 */
class MockDispatchQueueStore implements DispatchQueueStore {
  private state: DispatchQueueState = EMPTY_QUEUE;
  private listeners = new Set<QueueListener>();
  private channel: BroadcastChannel | null = null;
  private initialized = false;

  private ensureClientInit() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    this.state = this.readFromStorage();

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        const next = parseQueueState(event.data);
        if (next) this.setLocal(next);
      };
    }

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = parseQueueState(JSON.parse(event.newValue));
        if (next) this.setLocal(next);
      } catch {
        /* ignore malformed payloads */
      }
    });
  }

  private migrateLegacy(): DispatchQueueState | null {
    try {
      const raw = localStorage.getItem(LEGACY_GROUPS_KEY);
      if (!raw) return null;
      const legacy = JSON.parse(raw) as LegacyGroup[];
      if (!Array.isArray(legacy) || legacy.length === 0) return null;

      const groups: WhatsAppGroup[] = legacy.map((g, index) => ({
        id: g.id ?? crypto.randomUUID(),
        name: g.name ?? "",
        url: g.link ?? "",
        flyer_clicked: false,
        text_clicked: false,
        order: index,
      }));

      return { ...EMPTY_QUEUE, groups };
    } catch {
      return null;
    }
  }

  private readFromStorage(): DispatchQueueState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const migrated = this.migrateLegacy();
        if (migrated) {
          this.persist(migrated);
          return expireCooldown(migrated);
        }
        return EMPTY_QUEUE;
      }
      const parsed = parseQueueState(JSON.parse(raw)) ?? EMPTY_QUEUE;
      return expireCooldown(parsed);
    } catch {
      return EMPTY_QUEUE;
    }
  }

  private setLocal(next: DispatchQueueState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
  }

  private persist(next: DispatchQueueState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota/availability errors */
    }
    this.channel?.postMessage(next);
  }

  private commit(next: DispatchQueueState) {
    this.setLocal(next);
    this.persist(next);
  }

  getState(): DispatchQueueState {
    this.ensureClientInit();
    const expired = expireCooldown(this.state);
    if (expired !== this.state) this.commit(expired);
    return this.state;
  }

  subscribe(listener: QueueListener): () => void {
    this.ensureClientInit();
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async addGroup({ name, url }: AddGroupInput): Promise<void> {
    this.ensureClientInit();
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
    this.commit({
      ...this.state,
      groups: normalizeOrder([...this.state.groups, group]),
    });
  }

  async removeGroup(id: string): Promise<void> {
    this.ensureClientInit();
    this.commit({
      ...this.state,
      groups: normalizeOrder(this.state.groups.filter((g) => g.id !== id)),
    });
  }

  async markFlyer(id: string): Promise<void> {
    this.ensureClientInit();
    this.commit(applyClick(this.state, id, "flyer_clicked"));
  }

  async markText(id: string): Promise<void> {
    this.ensureClientInit();
    this.commit(applyClick(this.state, id, "text_clicked"));
  }

  async setCooldownMinutes(minutes: number): Promise<void> {
    this.ensureClientInit();
    this.commit({ ...this.state, cooldown_minutes: clampMinutes(minutes) });
  }

  async cancelCooldown(): Promise<void> {
    this.ensureClientInit();
    this.commit({
      ...this.state,
      cooldown: { is_active: false, ends_at: null },
    });
  }
}

export function createMockDispatchQueueStore(): DispatchQueueStore {
  return new MockDispatchQueueStore();
}
