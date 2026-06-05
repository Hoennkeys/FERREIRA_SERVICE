import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";
import { isMissingTableError } from "./supabase-errors";

function allowReservasLocalFallback(): boolean {
  return !isSupabaseConfigured();
}

const LOCAL_RESERVAS_KEY = "ferreira-reservas-semana";

let reservasUseLocalFallback = false;

function readLocalReservasAll(): ReservaSemana[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_RESERVAS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReservaSemana[];
  } catch {
    return [];
  }
}

function writeLocalReservasAll(reservas: ReservaSemana[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_RESERVAS_KEY, JSON.stringify(reservas));
  } catch {
    /* ignore */
  }
}

function readLocalReservasForWeek(semanaInicio: string): ReservaSemana[] {
  return readLocalReservasAll().filter((r) => r.semana_inicio === semanaInicio);
}

function insertLocalReservas(rows: Omit<ReservaSemana, "id">[]): boolean {
  const all = readLocalReservasAll();
  for (const row of rows) {
    const conflict = all.some(
      (r) =>
        r.slot_id === row.slot_id &&
        r.semana_inicio === row.semana_inicio &&
        r.status === "ativa",
    );
    if (conflict) return false;
  }
  writeLocalReservasAll([
    ...all,
    ...rows.map((row) => ({ ...row, id: crypto.randomUUID() })),
  ]);
  return true;
}

function deleteLocalReservasForPedido(pedidoId: string): void {
  writeLocalReservasAll(
    readLocalReservasAll().filter((r) => r.pedido_id !== pedidoId),
  );
}

export function isReservasLocalFallback(): boolean {
  return reservasUseLocalFallback;
}
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

/** Offset from Monday within the operational week (0 = Segunda … 6 = Domingo). */
const DIA_WEEK_OFFSET: Record<string, number> = {
  Segunda: 0,
  Terca: 1,
  Quarta: 2,
  Quinta: 3,
  Sexta: 4,
  Sabado: 5,
  Domingo: 6,
};

/**
 * Data/hora real do slot na semana operacional (timezone local).
 * Ex.: semana_inicio 2026-06-01 + Sabado + 15h → 2026-06-06 15:00 local.
 */
export function getSlotDateTime(
  semanaInicio: string,
  diaDaSemana: string,
  horaInicio: number,
): Date {
  const monday = parseLocalDate(semanaInicio);
  const d = new Date(monday);
  d.setDate(d.getDate() + (DIA_WEEK_OFFSET[diaDaSemana] ?? 0));
  d.setHours(horaInicio, 0, 0, 0);
  return d;
}

export function formatDayColumnLabel(
  dia: string,
  semanaInicio: string,
): string {
  const offset = DIA_WEEK_OFFSET[dia] ?? 0;
  const d = parseLocalDate(semanaInicio);
  d.setDate(d.getDate() + offset);
  const dateStr = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${DIAS_LABELS[dia]} ${dateStr}`;
}

/** Reserva ativa bloqueia; finalizada não bloqueia (liberada ao encerrar pedido). */
export function isReservaBlocking(reserva: ReservaSemana | undefined): boolean {
  return reserva?.status === "ativa";
}

/** Template legado 'agendado' é ignorado — reservas ficam em reservas_semana. */
export function getTemplateBaseStatus(slot: AgendaSlot): SlotStatus {
  if (slot.status === "agendado") return "disponivel";
  return slot.status;
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
  if (reservasUseLocalFallback) {
    return readLocalReservasForWeek(semanaInicio);
  }

  const { data, error } = await supabase
    .from("reservas_semana")
    .select("id, slot_id, semana_inicio, pedido_id, status")
    .eq("semana_inicio", semanaInicio);

  if (error) {
    if (
      isMissingTableError(error.code, error.message) &&
      allowReservasLocalFallback()
    ) {
      reservasUseLocalFallback = true;
      console.warn(
        "[agenda] reservas_semana ausente — usando reservas locais (rode npm run db:setup)",
      );
      return readLocalReservasForWeek(semanaInicio);
    }
    if (isMissingTableError(error.code, error.message)) {
      console.warn(
        "[agenda] reservas_semana ausente — execute supabase/setup.sql",
      );
    }
    console.warn("[agenda] fetchReservasForWeek error:", error.message);
    return [];
  }
  return (data ?? []) as ReservaSemana[];
}

export function buildReservaMap(
  reservas: ReservaSemana[],
): Map<string, ReservaSemana> {
  const map = new Map<string, ReservaSemana>();
  for (const r of reservas) {
    map.set(r.slot_id, r);
  }
  return map;
}

/**
 * Merge template + reservas ativas da semana corrente.
 * Slots com reserva `ativa` = agendado; template `bloqueado` = bloqueado.
 */
export function getEffectiveSlotStatus(
  slot: AgendaSlot,
  reservaMap: Map<string, ReservaSemana>,
): SlotStatus {
  if (isReservaBlocking(reservaMap.get(slot.id))) {
    return "agendado";
  }
  return getTemplateBaseStatus(slot);
}

export function isSlotAvailableForBooking(
  slot: AgendaSlot,
  reservaMap: Map<string, ReservaSemana>,
  rawTemplate?: AgendaSlot,
): boolean {
  const raw = rawTemplate ?? slot;
  if (getTemplateBaseStatus(raw) === "bloqueado") return false;
  if (isReservaBlocking(reservaMap.get(slot.id))) return false;
  return true;
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

  const [existing, template] = await Promise.all([
    fetchReservasForWeek(semanaInicio),
    fetchAgenda(),
  ]);
  const reservaMap = buildReservaMap(
    existing.filter((r) => r.status === "ativa"),
  );
  const templateMap = new Map(template.map((s) => [s.id, s]));

  for (const id of ids) {
    const slot = templateMap.get(id);
    if (!slot || !isSlotAvailableForBooking(slot, reservaMap, slot)) {
      return false;
    }
  }

  const rows = ids.map((slot_id) => ({
    slot_id,
    semana_inicio: semanaInicio,
    pedido_id: pedidoId,
    status: "ativa" as const,
  }));

  if (reservasUseLocalFallback) {
    return insertLocalReservas(rows);
  }

  const { error } = await supabase.from("reservas_semana").insert(rows);

  if (error) {
    if (
      isMissingTableError(error.code, error.message) &&
      allowReservasLocalFallback()
    ) {
      reservasUseLocalFallback = true;
      return insertLocalReservas(rows);
    }
    console.warn("[agenda] bookSlotBlock error:", error.code, error.message);
    return false;
  }

  return true;
}

export async function rollbackReservasForPedido(
  pedidoId: string,
): Promise<void> {
  if (reservasUseLocalFallback) {
    deleteLocalReservasForPedido(pedidoId);
    return;
  }
  const { error } = await supabase
    .from("reservas_semana")
    .delete()
    .eq("pedido_id", pedidoId);
  if (error) {
    if (
      isMissingTableError(error.code, error.message) &&
      allowReservasLocalFallback()
    ) {
      reservasUseLocalFallback = true;
      deleteLocalReservasForPedido(pedidoId);
      return;
    }
    console.warn("[agenda] rollbackReservas error:", error.message);
  }
}

/**
 * Remove reservas `ativa` ligadas a pedidos inexistentes, finalizados ou arquivados.
 * Corrige agenda vermelha sem contrato pendente/ativo no painel.
 */
export async function repairOrphanReservas(localContext?: {
  validPedidoIds: Iterable<string>;
  closedPedidoIds: Iterable<string>;
}): Promise<number> {
  if (reservasUseLocalFallback) {
    if (!localContext) return 0;
    const valid = new Set(localContext.validPedidoIds);
    const closed = new Set(localContext.closedPedidoIds);
    const all = readLocalReservasAll();
    const kept = all.filter((r) => {
      if (r.status !== "ativa") return true;
      if (!valid.has(r.pedido_id) || closed.has(r.pedido_id)) return false;
      return true;
    });
    const removed = all.length - kept.length;
    if (removed > 0) writeLocalReservasAll(kept);
    return removed;
  }

  const { data: reservas, error: resErr } = await supabase
    .from("reservas_semana")
    .select("id, pedido_id")
    .eq("status", "ativa");

  if (resErr) {
    if (!isMissingTableError(resErr.code, resErr.message)) {
      console.warn("[agenda] repairOrphanReservas:", resErr.message);
    }
    return 0;
  }
  if (!reservas?.length) return 0;

  const pedidoIds = [...new Set(reservas.map((r) => r.pedido_id as string))];
  const { data: pedidos, error: pedErr } = await supabase
    .from("pedidos_cliente")
    .select("id, status")
    .in("id", pedidoIds);

  if (pedErr) {
    console.warn("[agenda] repairOrphanReservas pedidos:", pedErr.message);
    return 0;
  }

  const statusByPedido = new Map(
    (pedidos ?? []).map((p) => [p.id as string, p.status as string]),
  );

  const orphanIds = reservas
    .filter((r) => {
      const status = statusByPedido.get(r.pedido_id as string);
      return !status || status === "Finalizado" || status === "Arquivado";
    })
    .map((r) => r.id as string);

  if (orphanIds.length === 0) return 0;

  const { error: delErr } = await supabase
    .from("reservas_semana")
    .delete()
    .in("id", orphanIds);

  if (delErr) {
    console.warn("[agenda] repairOrphanReservas delete:", delErr.message);
    return 0;
  }

  return orphanIds.length;
}

/** Corrige slots legados marcados agendado no template (pré-reservas_semana). */
export async function repairLegacyAgendadoSlots(): Promise<void> {
  const { error } = await supabase
    .from("disponibilidade_agenda")
    .update({ status: "disponivel" })
    .eq("status", "agendado");
  if (error) console.warn("[agenda] repairLegacyAgendado:", error.message);
}

/** Remove todas as reservas do pedido (libera slots imediatamente). */
export async function releasePedidoReservas(pedidoId: string): Promise<void> {
  await rollbackReservasForPedido(pedidoId);
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
  const reservaMap = buildReservaMap(
    reservas.filter((r) => r.status === "ativa"),
  );
  const templateMap = new Map(allSlots.map((s) => [s.id, s]));

  const ids = allSlots
    .filter((s) => {
      if (!dias.includes(s.dia_da_semana)) return false;
      if (!horas.includes(s.hora_inicio)) return false;
      return isSlotAvailableForBooking(s, reservaMap, templateMap.get(s.id));
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
  if (!raw) return;

  const base = getTemplateBaseStatus(raw);
  if (base === "agendado") return;

  const next: SlotStatus = base === "disponivel" ? "bloqueado" : "disponivel";

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
    if (!raw) return false;
    return getTemplateBaseStatus(raw) !== "agendado";
  });
  if (changeable.length === 0) return;

  const hasDisponivel = changeable.some((s) => {
    const raw = templateMap.get(s.id);
    return raw && getTemplateBaseStatus(raw) === "disponivel";
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
