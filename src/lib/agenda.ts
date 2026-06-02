import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// ── Types ────────────────────────────────────────────────────────────────────

export type SlotStatus = "disponivel" | "bloqueado" | "agendado";

export type ReservaStatus = "ativa" | "finalizada";

export interface AgendaSlot {
  id: string;
  dia_da_semana: string;
  hora_inicio: number;
  status: SlotStatus;
}

export interface ReservaSemana {
  id: string;
  slot_id: string;
  semana_inicio: string;
  pedido_id: string;
  status: ReservaStatus;
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
  Terca: "Terça-feira",
  Quarta: "Quarta-feira",
  Quinta: "Quinta-feira",
  Sexta: "Sexta-feira",
  Sabado: "Sábado",
  Domingo: "Domingo",
};

/** 7h → 21h inclusive */
export const HORAS: number[] = Array.from({ length: 15 }, (_, i) => i + 7);

/** Map short labels (SEG, TER…) back to internal dia keys */
export const LABEL_TO_DIA: Record<string, string> = Object.fromEntries(
  Object.entries(DIAS_LABELS).map(([dia, label]) => [label, dia]),
);

/** Parse "15h" → 15 */
export function parseHorarioLabel(horario: string): number | null {
  const match = horario.trim().match(/^(\d{1,2})h?$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  if (!Number.isFinite(hour) || hour < 7 || hour > 21) return null;
  return hour;
}

/** ISO date (YYYY-MM-DD) of Monday for the given date (local timezone). */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDateISO(d);
}

export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatWeekRange(semanaInicio: string): string {
  const start = parseLocalDate(semanaInicio);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Build agenda_dias / agenda_horarios from a booked block */
export function agendaFromBlock(slots: AgendaSlot[]): {
  dias: string[];
  horarios: string[];
} {
  if (slots.length === 0) return { dias: [], horarios: [] };
  const dia = DIAS_LABELS[slots[0].dia_da_semana] ?? slots[0].dia_da_semana;
  const horarios = slots
    .slice()
    .sort((a, b) => a.hora_inicio - b.hora_inicio)
    .map((s) => `${s.hora_inicio}h`);
  return { dias: [dia], horarios };
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

/** Busca todos os 105 slots do template ordenados por dia/hora */
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

export async function fetchReservasForWeek(
  semanaInicio: string = getWeekStart(),
): Promise<ReservaSemana[]> {
  const { data, error } = await supabase
    .from("reservas_semana")
    .select("id, slot_id, semana_inicio, pedido_id, status")
    .eq("semana_inicio", semanaInicio);

  if (error) {
    if (error.code === "42P01") return [];
    console.warn("[agenda] fetchReservasForWeek error:", error.message);
    return [];
  }
  return (data ?? []) as ReservaSemana[];
}

const reservaBySlot = new Map<string, ReservaSemana>();

export function buildReservaMap(reservas: ReservaSemana[]): Map<string, ReservaSemana> {
  const map = new Map<string, ReservaSemana>();
  for (const r of reservas) {
    map.set(r.slot_id, r);
  }
  return map;
}

/**
 * Merge template status with weekly reservations.
 * Reserva ativa ou finalizada na semana = agendado (vermelho).
 * Legacy: template status agendado also blocks (migration fallback).
 */
export function getEffectiveSlotStatus(
  slot: AgendaSlot,
  reservaMap: Map<string, ReservaSemana>,
): SlotStatus {
  const reserva = reservaMap.get(slot.id);
  if (reserva && (reserva.status === "ativa" || reserva.status === "finalizada")) {
    return "agendado";
  }
  if (slot.status === "agendado") {
    return "agendado";
  }
  return slot.status;
}

export function applyEffectiveStatus(
  slots: AgendaSlot[],
  reservas: ReservaSemana[],
): AgendaSlot[] {
  const map = buildReservaMap(reservas);
  return slots.map((s) => ({
    ...s,
    status: getEffectiveSlotStatus(s, map),
  }));
}


export async function bookSlotBlock(
  ids: string[],
  pedidoId: string,
  semanaInicio: string = getWeekStart(),
): Promise<boolean> {
  if (ids.length === 0) return false;

  const existing = await fetchReservasForWeek(semanaInicio);
  const taken = new Set(existing.map((r) => r.slot_id));
  if (ids.some((id) => taken.has(id))) return false;

  const template = await fetchAgenda();
  const templateMap = new Map(template.map((s) => [s.id, s]));
  for (const id of ids) {
    const slot = templateMap.get(id);
    if (!slot || slot.status === "bloqueado") return false;
  }

  const rows = ids.map((slot_id) => ({
    slot_id,
    semana_inicio: semanaInicio,
    pedido_id: pedidoId,
    status: "ativa" as const,
  }));

  const { error } = await supabase.from("reservas_semana").insert(rows);

  if (error) {
    console.warn("[agenda] bookSlotBlock error:", error.message);
    return false;
  }

  return true;
}

export async function rollbackReservasForPedido(pedidoId: string): Promise<void> {
  const { error } = await supabase
    .from("reservas_semana")
    .delete()
    .eq("pedido_id", pedidoId);
  if (error) console.warn("[agenda] rollbackReservas error:", error.message);
}

export async function releasePedidoReservas(pedidoId: string): Promise<void> {
  const { error } = await supabase
    .from("reservas_semana")
    .update({ status: "finalizada" })
    .eq("pedido_id", pedidoId)
    .eq("status", "ativa");

  if (error) console.warn("[agenda] releasePedidoReservas error:", error.message);
}

/**
 * Reserva slots pela combinação dia (SEG, TER…) + horário (15h, 16h…).
 * Usado para pedidos legados sem reservas pré-existentes.
 */
export async function bookSlotsBySchedule(
  diasLabels: string[],
  horarios: string[],
  pedidoId: string,
  semanaInicio: string = getWeekStart(),
): Promise<boolean> {
  const dias = diasLabels
    .map((label) => LABEL_TO_DIA[label.toUpperCase()] ?? label)
    .filter(Boolean);

  const horas = horarios
    .map(parseHorarioLabel)
    .filter((h): h is number => h !== null);

  if (dias.length === 0 || horas.length === 0) return false;

  const allSlots = await fetchAgenda();
  const reservas = await fetchReservasForWeek(semanaInicio);
  const reservaMap = buildReservaMap(reservas);

  const ids = allSlots
    .filter((s) => {
      if (!dias.includes(s.dia_da_semana)) return false;
      if (!horas.includes(s.hora_inicio)) return false;
      return getEffectiveSlotStatus(s, reservaMap) === "disponivel";
    })
    .map((s) => s.id);

  if (ids.length === 0) return false;

  return bookSlotBlock(ids, pedidoId, semanaInicio);
}

/**
 * Toggle admin: disponivel ↔ bloqueado (template only).
 * Effective agendado from reservations cannot be toggled.
 */
export async function toggleAdminSlot(
  id: string,
  currentStatus: SlotStatus,
): Promise<void> {
  if (currentStatus === "agendado") return;

  const template = await fetchAgenda();
  const raw = template.find((s) => s.id === id);
  if (!raw || raw.status === "agendado") return;

  const next: SlotStatus =
    raw.status === "disponivel" ? "bloqueado" : "disponivel";

  const { error } = await supabase
    .from("disponibilidade_agenda")
    .update({ status: next })
    .eq("id", id);

  if (error) {
    console.warn("[agenda] toggleAdminSlot error:", error.message);
  }
}

export async function bulkToggle(slots: AgendaSlot[]): Promise<void> {
  const template = await fetchAgenda();
  const templateMap = new Map(template.map((s) => [s.id, s]));

  const changeable = slots.filter((s) => {
    if (s.status === "agendado") return false;
    const raw = templateMap.get(s.id);
    return raw && raw.status !== "agendado";
  });
  if (changeable.length === 0) return;

  const hasDisponivel = changeable.some((s) => {
    const raw = templateMap.get(s.id);
    return raw?.status === "disponivel";
  });
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

export function subscribeReservas(
  semanaInicio: string,
  onChange: () => void,
): RealtimeChannel {
  return supabase
    .channel(`reservas_semana_${semanaInicio}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "reservas_semana",
      },
      () => {
        onChange();
      },
    )
    .subscribe();
}
