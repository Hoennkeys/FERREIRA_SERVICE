import { supabase } from "../supabase";
import {
  bookSlotsBySchedule,
  releasePedidoReservas,
  rollbackReservasForPedido,
} from "../agenda";
import { dispatchQueueStore } from "../dispatch-queue";
import type { ClientsStore, ClientsListener } from "./store";
import {
  rowToClient,
  type ApproveResult,
  type ClientsState,
  type CreateOrderInput,
  type FinalizeResult,
  type PedidoRow,
} from "./types";

const TABLE = "pedidos_cliente";

function whatsAppToUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

class SupabaseClientsStore implements ClientsStore {
  private state: ClientsState = { clients: [] };
  private listeners = new Set<ClientsListener>();
  private subscribed = false;

  private emit() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private setClients(clients: ClientsState["clients"]) {
    this.state = { clients };
    this.emit();
  }

  private async fetchAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code !== "42P01") {
        console.warn("[clients] fetchAll error:", error.message);
      }
      return;
    }

    this.setClients((data as PedidoRow[]).map(rowToClient));
  }

  private ensureRealtime() {
    if (this.subscribed || typeof window === "undefined") return;
    this.subscribed = true;

    void this.fetchAll();

    supabase
      .channel("pedidos_cliente_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        () => {
          void this.fetchAll();
        },
      )
      .subscribe();
  }

  getState(): ClientsState {
    this.ensureRealtime();
    return this.state;
  }

  subscribe(listener: ClientsListener): () => void {
    this.ensureRealtime();
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async createOrder(
    input: CreateOrderInput,
  ): Promise<{ ok: true; id: string } | { ok: false }> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        nome: input.nome,
        whatsapp: input.whatsapp,
        discord: input.discord ?? null,
        char_nome: input.charNome,
        char_level: input.charLevel,
        char_servidor: input.charServidor,
        pacote_id: input.pacoteId,
        pacote_nome: input.pacoteNome,
        pacote_horas: input.pacoteHoras,
        pacote_preco: input.pacotePreco,
        agenda_dias: input.agendaDias,
        agenda_horarios: input.agendaHorarios,
        slot_ids: input.slotIds,
        semana_inicio: input.semanaInicio,
        status: "Pendente",
        origem: "homepage",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.warn("[clients] createOrder error:", error?.message);
      return { ok: false };
    }

    await this.fetchAll();
    return { ok: true, id: data.id as string };
  }

  async deleteOrder(id: string): Promise<void> {
    await rollbackReservasForPedido(id);
    await supabase.from(TABLE).delete().eq("id", id);
    await this.fetchAll();
  }

  async approveClient(id: string): Promise<ApproveResult> {
    const client = this.state.clients.find((c) => c.id === id);
    if (!client) return { ok: false, reason: "not_found" };
    if (client.status === "Ativo") return { ok: false, reason: "already_active" };

    const hasReservations = client.slotIds.length > 0 && client.semanaInicio;

    if (!hasReservations) {
      const booked = await bookSlotsBySchedule(
        client.agenda.dias,
        client.agenda.horarios,
        id,
        client.semanaInicio || undefined,
      );
      if (!booked) return { ok: false, reason: "booking_failed" };
    }

    const groupUrl =
      client.contato.grupoWhatsApp ?? whatsAppToUrl(client.contato.whatsapp);

    await dispatchQueueStore.addGroup({
      name: client.character.nome,
      url: groupUrl,
    });

    const { error } = await supabase
      .from(TABLE)
      .update({ status: "Ativo", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.warn("[clients] approveClient error:", error.message);
      return { ok: false, reason: "booking_failed" };
    }

    await this.fetchAll();
    return { ok: true };
  }

  async archiveClient(id: string): Promise<void> {
    await supabase
      .from(TABLE)
      .update({ status: "Arquivado", updated_at: new Date().toISOString() })
      .eq("id", id);
    await this.fetchAll();
  }

  async finalizeClient(id: string): Promise<FinalizeResult> {
    const client = this.state.clients.find((c) => c.id === id);
    if (!client) return { ok: false, reason: "not_found" };
    if (client.status !== "Ativo") return { ok: false, reason: "invalid_status" };

    await releasePedidoReservas(id);

    const { error } = await supabase
      .from(TABLE)
      .update({ status: "Finalizado", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.warn("[clients] finalizeClient error:", error.message);
      return { ok: false, reason: "not_found" };
    }

    await this.fetchAll();
    return { ok: true };
  }
}

export function createSupabaseClientsStore(): ClientsStore {
  return new SupabaseClientsStore();
}
