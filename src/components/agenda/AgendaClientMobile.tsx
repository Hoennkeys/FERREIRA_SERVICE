"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DIAS,
  DIAS_LABELS,
  DIAS_FULL_LABELS,
  HORAS,
  formatDayColumnLabel,
  formatWeekRange,
  type AgendaSlot,
} from "@/lib/agenda";

type ClientState =
  | "selectedStart"
  | "selectedBlock"
  | "previewStart"
  | "previewBlock"
  | "validStart"
  | "invalidStart"
  | "bloqueado"
  | "agendado";

function chipDateOnly(dia: string, semanaInicio: string): string {
  const label = formatDayColumnLabel(dia, semanaInicio);
  const space = label.indexOf(" ");
  return space >= 0 ? label.slice(space + 1) : label;
}

function countValidStarts(
  dia: string,
  isValidStart: (dia: string, hora: number) => boolean,
): number {
  return HORAS.filter((h) => isValidStart(dia, h)).length;
}

function pickInitialDay(
  isValidStart: (dia: string, hora: number) => boolean,
  selectedStartId: string | null,
  slotMap: Map<string, AgendaSlot>,
): string {
  if (selectedStartId) {
    for (const s of slotMap.values()) {
      if (s.id === selectedStartId) return s.dia_da_semana;
    }
  }
  return DIAS.find((d) => countValidStarts(d, isValidStart) > 0) ?? DIAS[0];
}

function resolveClientState(params: {
  dia: string;
  hora: number;
  duracao: number;
  status: AgendaSlot["status"] | "bloqueado";
  valid: boolean;
  selIdSet: Set<string>;
  selStart: string | null;
  slot: AgendaSlot | undefined;
  previewStart: number | null;
  selectedDia: string;
}): ClientState {
  const {
    dia,
    hora,
    duracao,
    status,
    valid,
    selIdSet,
    selStart,
    slot,
    previewStart,
    selectedDia,
  } = params;

  const inSelected = !!slot && selIdSet.has(slot.id);
  const isSelStart = !!slot && slot.id === selStart;

  const inPreview =
    selectedDia === dia &&
    previewStart !== null &&
    hora >= previewStart &&
    hora < previewStart + duracao;
  const isPreviewStart = inPreview && hora === previewStart;

  if (inSelected) return isSelStart ? "selectedStart" : "selectedBlock";
  if (inPreview) return isPreviewStart ? "previewStart" : "previewBlock";
  if (status === "agendado") return "agendado";
  if (valid) return "validStart";
  return status === "disponivel" ? "invalidStart" : "bloqueado";
}

function listRowClass(state: ClientState): string {
  const base =
    "w-full flex items-center justify-between gap-3 rounded-xl border px-4 min-h-[48px] text-left transition-all duration-100 touch-manipulation";

  switch (state) {
    case "selectedStart":
      return `${base} bg-cyan-400 border-cyan-300 text-black shadow-[0_0_14px_rgba(34,211,238,0.5)]`;
    case "selectedBlock":
      return `${base} bg-cyan-400/60 border-cyan-300/70 text-black/85`;
    case "previewStart":
    case "previewBlock":
      return `${base} bg-cyan-500/25 border-cyan-400/50 text-cyan-100`;
    case "validStart":
      return `${base} bg-cyan-500/10 border-cyan-500/30 text-cyan-300 active:bg-cyan-500/25`;
    case "agendado":
      return `${base} bg-red-500/10 border-red-500/25 text-red-400/90 cursor-not-allowed opacity-80`;
    default:
      return `${base} bg-white/[0.02] border-white/8 text-white/25 cursor-not-allowed`;
  }
}

function listRowSubtitle(state: ClientState, duracao: number): string {
  switch (state) {
    case "agendado":
      return "Horário reservado";
    case "invalidStart":
      return `Sem espaço para ${duracao}h seguidas`;
    case "bloqueado":
      return "Indisponível";
    case "validStart":
    case "previewStart":
    case "previewBlock":
    case "selectedStart":
    case "selectedBlock":
      return duracao > 1 ? `Bloco de ${duracao}h` : "Disponível";
    default:
      return "";
  }
}

export function AgendaClientMobile({
  semanaInicio,
  duracao,
  slotMap,
  selectedBlockIds,
  isValidStart,
  getBlock,
  onSelect,
}: {
  semanaInicio: string;
  duracao: number;
  slotMap: Map<string, AgendaSlot>;
  selectedBlockIds?: string[];
  isValidStart: (dia: string, hora: number) => boolean;
  getBlock: (dia: string, hora: number) => AgendaSlot[];
  onSelect?: (block: AgendaSlot[]) => void;
}) {
  const selIdSet = useMemo(
    () => new Set(selectedBlockIds ?? []),
    [selectedBlockIds],
  );
  const selStart = selectedBlockIds?.[0] ?? null;

  const [selectedDia, setSelectedDia] = useState(() =>
    pickInitialDay(isValidStart, selStart, slotMap),
  );
  const [previewStart, setPreviewStart] = useState<number | null>(null);

  const validCountByDay = Object.fromEntries(
    DIAS.map((d) => [d, countValidStarts(d, isValidStart)]),
  ) as Record<string, number>;

  useEffect(() => {
    if (!selStart) return;
    for (const s of slotMap.values()) {
      if (s.id === selStart) {
        setSelectedDia(s.dia_da_semana);
        return;
      }
    }
  }, [selStart, slotMap]);

  useEffect(() => {
    if (selStart) return;
    const currentHasSlots = validCountByDay[selectedDia] > 0;
    if (!currentHasSlots) {
      const next = pickInitialDay(isValidStart, null, slotMap);
      setSelectedDia(next);
    }
  }, [validCountByDay, selectedDia, selStart, isValidStart, slotMap]);

  function handlePick(slot: AgendaSlot) {
    if (!isValidStart(slot.dia_da_semana, slot.hora_inicio)) return;
    onSelect?.(getBlock(slot.dia_da_semana, slot.hora_inicio));
    setPreviewStart(null);
  }

  const dayValidCount = validCountByDay[selectedDia] ?? 0;
  const selectedDayLabel = DIAS_FULL_LABELS[selectedDia] ?? selectedDia;

  return (
    <div className="w-full">
      <p className="mb-2 text-[10px] tracking-[0.14em] text-white/40 font-mono">
        Semana operacional: {formatWeekRange(semanaInicio)}
      </p>

      <div
        className="grid grid-cols-7 gap-1 mb-3"
        role="tablist"
        aria-label="Dias da semana"
      >
        {DIAS.map((dia) => {
          const isActive = selectedDia === dia;
          const hasSlots = (validCountByDay[dia] ?? 0) > 0;
          const hasSelectionOnDay = [...slotMap.values()].some(
            (s) => s.dia_da_semana === dia && selIdSet.has(s.id),
          );

          return (
            <button
              key={dia}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setSelectedDia(dia);
                setPreviewStart(null);
              }}
              className={[
                "flex flex-col items-center justify-center rounded-lg border py-1.5 px-0.5 min-h-[48px] transition-all",
                isActive
                  ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                  : hasSlots
                    ? "border-white/15 bg-white/[0.03] text-white/70 hover:border-cyan-500/40"
                    : "border-white/8 bg-white/[0.02] text-white/35",
              ].join(" ")}
            >
              <span className="text-[10px] font-bold tracking-wider leading-none">
                {DIAS_LABELS[dia]}
              </span>
              <span className="mt-1 text-[9px] font-mono leading-none text-white/50">
                {chipDateOnly(dia, semanaInicio)}
              </span>
              <span
                className={[
                  "mt-1.5 h-1.5 w-1.5 rounded-full",
                  hasSelectionOnDay
                    ? "bg-cyan-400"
                    : hasSlots
                      ? "bg-emerald-400/90"
                      : "bg-white/15",
                ].join(" ")}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-white/80">{selectedDayLabel}</p>
        <p className="text-[10px] text-white/40 shrink-0">
          {dayValidCount > 0
            ? `${dayValidCount} horário${dayValidCount === 1 ? "" : "s"} disponível${dayValidCount === 1 ? "" : "is"}`
            : "Sem vagas para este pacote"}
        </p>
      </div>

      <ul
        className="space-y-1.5"
        role="listbox"
        aria-label={`Horários de ${selectedDayLabel}`}
      >
        {HORAS.map((h) => {
          const slot = slotMap.get(`${selectedDia}:${h}`);
          const status = slot?.status ?? "bloqueado";
          const valid =
            !!slot && status === "disponivel" && isValidStart(selectedDia, h);
          const state = resolveClientState({
            dia: selectedDia,
            hora: h,
            duracao,
            status,
            valid,
            selIdSet,
            selStart,
            slot,
            previewStart,
            selectedDia,
          });

          const endH = h + duracao;
          const timeLabel = `${String(h).padStart(2, "0")}:00`;
          const rangeLabel =
            duracao > 1 &&
            (valid ||
              state.startsWith("selected") ||
              state.startsWith("preview"))
              ? `${timeLabel} – ${String(endH).padStart(2, "0")}:00`
              : timeLabel;

          const clickable = valid;
          const subtitle = listRowSubtitle(state, duracao);

          return (
            <li key={h}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => slot && handlePick(slot)}
                onPointerEnter={() => clickable && setPreviewStart(h)}
                onPointerLeave={() => setPreviewStart(null)}
                onFocus={() => clickable && setPreviewStart(h)}
                onBlur={() => setPreviewStart(null)}
                className={listRowClass(state)}
              >
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {rangeLabel}
                  {state === "selectedStart" && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider">
                      ✓
                    </span>
                  )}
                </span>
                <span className="text-[10px] opacity-80 shrink-0">
                  {subtitle}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AgendaClientMobileSkeleton() {
  return (
    <div className="w-full">
      <div className="mb-3 h-3 w-48 rounded bg-white/5 animate-pulse" />
      <div className="grid grid-cols-7 gap-1 mb-3">
        {DIAS.map((d) => (
          <div
            key={d}
            className="h-[48px] rounded-lg bg-white/[0.04] animate-pulse"
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {HORAS.map((h) => (
          <div
            key={h}
            className="h-12 rounded-xl bg-white/[0.03] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
