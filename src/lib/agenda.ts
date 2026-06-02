import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// ── Types ────────────────────────────────────────────────────────────────────

export type SlotStatus = "disponivel" | "bloqueado" | "agendado";

export interface AgendaSlot {
  id: string;
  dia_da_semana: string;
  hora_inicio: number;
  status: SlotStatus;
}

export const DIAS: string[] = [
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
  "Domingo",
];

export const DIAS_LABELS: Record<string, string> = {
  Segunda: "SEG",
  Terca: "TER",
  Quarta: "QUA",
  Quinta: "QUI",
  Sexta: "SEX",
  Sabado: "SÁB",
  Domingo: "DOM",
};

export const DIAS_FULL_LABELS: Record<string, string> = {
  Segunda: "Segunda-feira",
  Terca:   "Terça-feira",
  Quarta:  "Quarta-feira",
  Quinta:  "Quinta-feira",
  Sexta:   "Sexta-feira",
  Sabado:  "Sábado",
  Domingo: "Domingo",
};

/** 7h → 21h inclusive */
export const HORAS: number[] = Array.from({ length: 15 }, (_, i) => i + 7);

// ── Supabase helpers ─────────────────────────────────────────────────────────

/** Busca todos os 105 slots ordenados por dia/hora */
export async function fetchAgenda(): Promise<AgendaSlot[]> {
  const { data, error } = await supabase
    .from("disponibilidade_agenda")
    .select("id, dia_da_semana, hora_inicio, status")
    .order("hora_inicio", { ascending: true });

  if (error) {
    console.warn("[agenda] fetchAgenda error:", error.message);
    return [];
  }
  return (data ?? []) as AgendaSlot[];
}

/**
 * Reserva um bloco de N slots de uma vez (ex.: pacote 7h → 7 IDs).
 *
 * Estratégia:
 * 1. UPDATE todos os IDs WHERE status='disponivel' e retorna as linhas afetadas.
 * 2. Se count < ids.length, houve conflito parcial → rollback dos que foram marcados.
 * 3. Retorna true somente se TODOS foram reservados com sucesso.
 */
export async function bookSlotBlock(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return false;

  const { data, error } = await supabase
    .from("disponibilidade_agenda")
    .update({ status: "agendado" })
    .in("id", ids)
    .eq("status", "disponivel")
    .select("id");

  if (error) {
    console.warn("[agenda] bookSlotBlock error:", error.message);
    return false;
  }

  const booked = (data ?? []) as { id: string }[];

  if (booked.length === ids.length) return true;

  // Parcial: desfaz o que foi reservado para não deixar blocos incompletos
  if (booked.length > 0) {
    const rollbackIds = booked.map((r) => r.id);
    const { error: rbErr } = await supabase
      .from("disponibilidade_agenda")
      .update({ status: "disponivel" })
      .in("id", rollbackIds);
    if (rbErr) console.warn("[agenda] bookSlotBlock rollback error:", rbErr.message);
  }

  return false;
}

/**
 * Toggle admin: disponivel ↔ bloqueado.
 * Slots 'agendado' são ignorados (não devem ser alterados pelo admin).
 */
export async function toggleAdminSlot(
  id: string,
  currentStatus: SlotStatus,
): Promise<void> {
  if (currentStatus === "agendado") return;

  const next: SlotStatus =
    currentStatus === "disponivel" ? "bloqueado" : "disponivel";

  const { error } = await supabase
    .from("disponibilidade_agenda")
    .update({ status: next })
    .eq("id", id);

  if (error) {
    console.warn("[agenda] toggleAdminSlot error:", error.message);
  }
}

/**
 * Bulk toggle em lote: disponivel ↔ bloqueado para uma lista de slots.
 * Regra: se QUALQUER slot da lista for 'disponivel', todos viram 'bloqueado'.
 *        Se TODOS forem 'bloqueado', todos viram 'disponivel'.
 * Slots 'agendado' são sempre ignorados.
 * Uma única query .in() é enviada ao Supabase.
 */
export async function bulkToggle(slots: AgendaSlot[]): Promise<void> {
  const changeable = slots.filter((s) => s.status !== "agendado");
  if (changeable.length === 0) return;

  const hasDisponivel = changeable.some((s) => s.status === "disponivel");
  const targetStatus: SlotStatus = hasDisponivel ? "bloqueado" : "disponivel";
  const ids = changeable.map((s) => s.id);

  const { error } = await supabase
    .from("disponibilidade_agenda")
    .update({ status: targetStatus })
    .in("id", ids);

  if (error) {
    console.warn("[agenda] bulkToggle error:", error.message);
  }
}

/**
 * Subscreve mudanças na tabela via Supabase Realtime.
 * Chame `.unsubscribe()` no cleanup do useEffect.
 */
export function subscribeAgenda(
  onUpdate: (slot: AgendaSlot) => void,
): RealtimeChannel {
  return supabase
    .channel("disponibilidade_agenda_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "disponibilidade_agenda",
      },
      (payload) => {
        const row = payload.new as AgendaSlot;
        onUpdate(row);
      },
    )
    .subscribe();
}
