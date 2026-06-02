import {
  bookSlotsBySchedule,
  getWeekStart,
  releasePedidoReservas,
  rollbackReservasForPedido,
} from "../agenda";
import { dispatchQueueStore } from "../dispatch-queue";
import { getExpiredClosedClientIds } from "./retention";
import type { ClientsStore, ClientsListener } from "./store";
import type {
  ApproveResult,
  ClientsState,
  ContractClient,
  CreateOrderInput,
  CreateOrderResult,
  FinalizeResult,
} from "./types";

const STORAGE_KEY = "ferreira-clients-mock";

class MockClientsStore implements ClientsStore {
  private state: ClientsState = { clients: [] };
  private listeners = new Set<ClientsListener>();
  private initialized = false;

  private ensureInit() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.state = JSON.parse(raw) as ClientsState;
    } catch {
      /* ignore */
    }
    void this.purgeExpiredInternal();
  }

  private purgeExpiredInternal(): number {
    const expiredIds = getExpiredClosedClientIds(this.state.clients);
    if (expiredIds.length === 0) return 0;
    this.state = {
      clients: this.state.clients.filter((c) => !expiredIds.includes(c.id)),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
    return expiredIds.length;
  }

  async purgeExpiredClients(): Promise<number> {
    this.ensureInit();
    const removed = this.purgeExpiredInternal();
    if (removed > 0) this.emit();
    return removed;
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState(): ClientsState {
    this.ensureInit();
    return this.state;
  }

  subscribe(listener: ClientsListener): () => void {
    this.ensureInit();
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    this.ensureInit();
    const id = crypto.randomUUID();
    const client: ContractClient = {
      id,
      nome: input.nome,
      contato: { whatsapp: input.whatsapp, discord: input.discord },
      character: {
        nome: input.charNome,
        level: input.charLevel,
        servidor: input.charServidor,
      },
      pacote: {
        id: input.pacoteId,
        nome: input.pacoteNome,
        horas: input.pacoteHoras,
        preco: input.pacotePreco,
      },
      agenda: {
        dias: input.agendaDias,
        horarios: input.agendaHorarios,
      },
      slotIds: input.slotIds,
      semanaInicio: input.semanaInicio,
      status: "Pendente",
      origem: "homepage",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state = { clients: [client, ...this.state.clients] };
    this.persist();
    return { ok: true, id };
  }

  async deleteOrder(id: string): Promise<void> {
    this.ensureInit();
    await rollbackReservasForPedido(id);
    this.state = {
      clients: this.state.clients.filter((c) => c.id !== id),
    };
    this.persist();
  }

  async approveClient(id: string): Promise<ApproveResult> {
    this.ensureInit();
    const client = this.state.clients.find((c) => c.id === id);
    if (!client) return { ok: false, reason: "not_found" };
    if (client.status === "Ativo") return { ok: false, reason: "already_active" };

    if (client.slotIds.length === 0) {
      const booked = await bookSlotsBySchedule(
        client.agenda.dias,
        client.agenda.horarios,
        id,
        client.semanaInicio || getWeekStart(),
      );
      if (!booked) return { ok: false, reason: "booking_failed" };
    }

    const digits = client.contato.whatsapp.replace(/\D/g, "");
    await dispatchQueueStore.addGroup({
      name: client.character.nome,
      url: client.contato.grupoWhatsApp ?? `https://wa.me/${digits}`,
    });

    this.state = {
      clients: this.state.clients.map((c) =>
        c.id === id
          ? { ...c, status: "Ativo", updatedAt: new Date().toISOString() }
          : c,
      ),
    };
    this.persist();
    return { ok: true };
  }

  async archiveClient(id: string): Promise<void> {
    this.ensureInit();
    await releasePedidoReservas(id);
    this.state = {
      clients: this.state.clients.map((c) =>
        c.id === id
          ? { ...c, status: "Arquivado", updatedAt: new Date().toISOString() }
          : c,
      ),
    };
    this.persist();
  }

  async finalizeClient(id: string): Promise<FinalizeResult> {
    this.ensureInit();
    const client = this.state.clients.find((c) => c.id === id);
    if (!client) return { ok: false, reason: "not_found" };
    if (client.status !== "Ativo") return { ok: false, reason: "invalid_status" };

    await releasePedidoReservas(id);

    this.state = {
      clients: this.state.clients.map((c) =>
        c.id === id
          ? { ...c, status: "Finalizado", updatedAt: new Date().toISOString() }
          : c,
      ),
    };
    this.persist();
    return { ok: true };
  }
}

export function createMockClientsStore(): ClientsStore {
  return new MockClientsStore();
}
