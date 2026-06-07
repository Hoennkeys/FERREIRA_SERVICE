import { supabase } from "../supabase";
import {
  bookSlotsBySchedule,
  releasePedidoReservas,
  repairOrphanReservas,
  rollbackReservasForPedido,
} from "../agenda";
import { isClosedStatus } from "./retention";
import { isMissingTableError } from "../supabase-errors";
import { dispatchQueueStore } from "../dispatch-queue";
import { retentionCutoffIso } from "./retention";
import type { ClientsStore, ClientsListener } from "./store";
import {
  rowToClient,
  type ApproveResult,
  type ClientsState,
  type CreateOrderInput,
  type CreateOrderResult,
  type FinalizeResult,
  type PedidoRow,
  type RemoveClosedResult,
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

  private async reload() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (!isMissingTableError(error.code, error.message)) {
        console.warn("[clients] fetchAll error:", error.message);
      }
      return;
    }

    this.setClients((data as PedidoRow[]).map(rowToClient));
  }

  private async fetchAll() {
    await this.repairAgendaSync();
    await this.purgeExpiredInternal();
    await this.reload();
  }

  async repairAgendaSync(): Promise<number> {
    return repairOrphanReservas();
  }

  private async purgeExpiredInternal(): Promise<number> {
    const cutoff = retentionCutoffIso();
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .in("status", ["Finalizado", "Arquivado"])
      .lt("updated_at", cutoff)
      .select("id");

    if (error) {
      if (!isMissingTableError(error.code, error.message)) {
        console.warn("[clients] purgeExpired error:", error.message);
      }
      return 0;
    }

    return data?.length ?? 0;
  }

  async purgeExpiredClients(): Promise<number> {
    this.ensureRealtime();
    const removed = await this.purgeExpiredInternal();
    if (removed > 0) await this.reload();
    return removed;
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

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const { data, error } = await supabase.rpc("create_pedido_homepage", {
      p_nome: input.nome,
      p_whatsapp: input.whatsapp,
      p_discord: input.discord ?? null,
      p_char_nome: input.charNome,
      p_char_level: input.charLevel,
      p_char_servidor: input.charServidor,
      p_pacote_id: input.pacoteId,
      p_pacote_nome: input.pacoteNome,
      p_pacote_horas: input.pacoteHoras,
      p_pacote_preco: input.pacotePreco,
      p_agenda_dias: input.agendaDias,
      p_agenda_horarios: input.agendaHorarios,
      p_slot_ids: input.slotIds,
      p_semana_inicio: input.semanaInicio,
    });

    const row = Array.isArray(data) ? data[0] : data;
    const id = row?.id as string | undefined;
    const claimToken = row?.claim_token as string | undefined;

    if (error || !id || !claimToken) {
      console.warn("[clients] createOrder error:", error?.code, error?.message);
      const msg = error?.message ?? "";
      if (
        msg.includes("rate_limit") ||
        msg.includes("pending_limit") ||
        msg.includes("invalid_whatsapp")
      ) {
        return { ok: false, reason: "rate_limit" };
      }
      if (isMissingTableError(error?.code, error?.message)) {
        return { ok: false, reason: "setup" };
      }
      return { ok: false, reason: "unknown" };
    }

    return { ok: true, id, claimToken };
  }

  async deleteOrder(
    id: string,
    options?: { claimToken?: string },
  ): Promise<void> {
    if (options?.claimToken) {
      const { error } = await supabase.rpc("rollback_pedido_homepage", {
        p_id: id,
        p_claim_token: options.claimToken,
      });
      if (error) {
        console.warn(
          "[clients] rollback_pedido_homepage error:",
          error.message,
        );
      }
      return;
    }

    await rollbackReservasForPedido(id);
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      console.warn("[clients] deleteOrder error:", error.message);
    }
    await this.fetchAll();
  }

  async approveClient(id: string): Promise<ApproveResult> {
    const client = this.state.clients.find((c) => c.id === id);
    if (!client) return { ok: false, reason: "not_found" };
    if (client.status === "Ativo")
      return { ok: false, reason: "already_active" };

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
    await releasePedidoReservas(id);
    await supabase
      .from(TABLE)
      .update({ status: "Arquivado", updated_at: new Date().toISOString() })
      .eq("id", id);
    await this.fetchAll();
  }

  async finalizeClient(id: string): Promise<FinalizeResult> {
    const client = this.state.clients.find((c) => c.id === id);
    if (!client) return { ok: false, reason: "not_found" };
    if (client.status !== "Ativo")
      return { ok: false, reason: "invalid_status" };

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

  async removeClosedClient(id: string): Promise<RemoveClosedResult> {
    const client = this.state.clients.find((c) => c.id === id);
    if (!client) return { ok: false, reason: "not_found" };
    if (!isClosedStatus(client.status))
      return { ok: false, reason: "not_closed" };
    await this.deleteOrder(id);
    return { ok: true };
  }

  async removeAllClosedClients(): Promise<number> {
    const ids = this.state.clients
      .filter((c) => isClosedStatus(c.status))
      .map((c) => c.id);
    for (const id of ids) {
      await rollbackReservasForPedido(id);
      await supabase.from(TABLE).delete().eq("id", id);
    }
    if (ids.length > 0) await this.reload();
    return ids.length;
  }
}

export function createSupabaseClientsStore(): ClientsStore {
  return new SupabaseClientsStore();
}
