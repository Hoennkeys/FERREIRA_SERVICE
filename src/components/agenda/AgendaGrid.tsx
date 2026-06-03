"use client";

import { useEffect, useState } from "react";
import {
  AgendaClientMobile,
  AgendaClientMobileSkeleton,
} from "@/components/agenda/AgendaClientMobile";
import {
  DIAS,
  DIAS_LABELS,
  HORAS,
  applyEffectiveStatus,
  fetchAgenda,
  fetchReservasForWeek,
  formatDayColumnLabel,
  formatWeekRange,
  getWeekStart,
  subscribeAgenda,
  subscribeReservas,
  type AgendaSlot,
  type SlotStatus,
} from "@/lib/agenda";

// ── Client-slot visual state ──────────────────────────────────────────────────

type ClientState =
  | "selectedStart"    // first slot of the confirmed block
  | "selectedBlock"    // continuation of the confirmed block
  | "hoverStart"       // first slot of the hover preview
  | "hoverBlock"       // continuation of the hover preview
  | "validStart"       // disponivel + full block fits → clickable
  | "invalidStart"     // disponivel but block doesn't fit → disabled
  | "bloqueado"
  | "agendado";

function clientSlotClass(state: ClientState): string {
  const base =
    "flex items-center justify-center rounded border text-[10px] font-semibold tracking-wider transition-all duration-100 select-none h-9";

  switch (state) {
    case "selectedStart":
      return `${base} bg-cyan-400 border-cyan-300 text-black shadow-[0_0_14px_rgba(34,211,238,0.65)] z-10`;
    case "selectedBlock":
      return `${base} bg-cyan-400/65 border-cyan-300/80 text-black/80 shadow-[0_0_6px_rgba(34,211,238,0.25)]`;
    case "hoverStart":
      return `${base} bg-cyan-500/45 border-cyan-400/80 text-cyan-100 scale-105 cursor-pointer`;
    case "hoverBlock":
      return `${base} bg-cyan-500/20 border-cyan-500/50 text-cyan-300/70 cursor-pointer`;
    case "validStart":
      return `${base} bg-cyan-500/15 border-cyan-500/35 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-400/60 cursor-pointer`;
    case "agendado":
      return `${base} bg-red-500/20 border-red-500/30 text-red-400 cursor-not-allowed`;
    default: // invalidStart | bloqueado
      return `${base} bg-white/5 border-white/10 text-white/15 cursor-not-allowed`;
  }
}

// ── Admin-slot class (unchanged) ──────────────────────────────────────────────

function adminSlotClass(status: SlotStatus): string {
  const base =
    "flex items-center justify-center rounded border text-[10px] font-semibold tracking-wider transition-all duration-150 select-none h-9";
  if (status === "disponivel")
    return `${base} bg-cyan-500/15 border-cyan-500/35 text-cyan-400 hover:bg-cyan-500/40 hover:border-cyan-400/70 cursor-pointer`;
  if (status === "bloqueado")
    return `${base} bg-white/5 border-white/10 text-white/20 hover:bg-white/10 cursor-pointer`;
  return `${base} bg-red-500/20 border-red-500/30 text-red-400 cursor-not-allowed`;
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function GridSkeleton({ mode }: { mode: "client" | "admin" }) {
  if (mode === "client") {
    return (
      <>
        <div className="md:hidden">
          <AgendaClientMobileSkeleton />
        </div>
        <div className="hidden md:block w-full overflow-x-auto">
          <DesktopGridSkeleton />
        </div>
      </>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <DesktopGridSkeleton />
    </div>
  );
}

function DesktopGridSkeleton() {
  return (
    <div className="min-w-[540px]">
        <div className="grid grid-cols-8 gap-1 mb-1">
          <div />
          {DIAS.map((d) => (
            <div
              key={d}
              className="text-center text-[9px] tracking-widest text-white/30 font-semibold pb-1"
            >
              {DIAS_LABELS[d]}
            </div>
          ))}
        </div>
        {HORAS.map((h) => (
          <div key={h} className="grid grid-cols-8 gap-1 mb-1">
            <div className="flex items-center justify-end pr-2 text-[9px] text-white/25 font-mono">
              {String(h).padStart(2, "0")}h
            </div>
            {DIAS.map((d) => (
              <div
                key={d}
                className="h-9 rounded border border-white/5 bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        ))}
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────

function Legend({ mode, duracao }: { mode: "client" | "admin"; duracao: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      <LegendItem color="bg-cyan-500/15 border-cyan-500/35" label="Disponível" />
      {mode === "client" && (
        <>
          <LegendItem color="bg-cyan-400 border-cyan-300" label={`Bloco selecionado (${duracao}h)`} />
          <LegendItem color="bg-white/5 border-white/10" label="Indisponível / sem espaço" />
        </>
      )}
      {mode === "admin" && (
        <>
          <LegendItem color="bg-white/5 border-white/10" label="Bloqueado" />
          <LegendItem color="bg-primary/10 border-primary/30" label="Clique no dia/hora → massa" />
        </>
      )}
      <LegendItem color="bg-red-500/20 border-red-500/30" label="Agendado" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded border ${color} inline-block`} />
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  );
}

// ── Bulk helper ──────────────────────────────────────────────────────────────

function bulkTarget(slotsToChange: AgendaSlot[]): SlotStatus {
  const changeable = slotsToChange.filter((s) => s.status !== "agendado");
  return changeable.some((s) => s.status === "disponivel") ? "bloqueado" : "disponivel";
}

// ── Main component ────────────────────────────────────────────────────────────

interface AgendaGridProps {
  mode: "client" | "admin";
  /** Duration in hours for block selection (client mode). Defaults to 1. */
  duracao?: number;
  /** IDs of the currently selected block in order [start, …, end] (client mode). */
  selectedBlockIds?: string[];
  /** Called with the full consecutive block when the user clicks a valid start. */
  onSelect?: (block: AgendaSlot[]) => void;
  onAdminToggle?: (slot: AgendaSlot) => void;
  onBulkDay?: (dia: string, slotsForDay: AgendaSlot[]) => void;
  onBulkHora?: (hora: number, slotsForHora: AgendaSlot[]) => void;
}

export function AgendaGrid({
  mode,
  duracao = 1,
  selectedBlockIds,
  onSelect,
  onAdminToggle,
  onBulkDay,
  onBulkHora,
}: AgendaGridProps) {
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDia, setHoveredDia] = useState<string | null>(null);
  const [hoveredHora, setHoveredHora] = useState<number | null>(null);
  const semanaInicio = getWeekStart();

  const reloadGrid = async (mounted: { current: boolean }) => {
    const [template, reservas] = await Promise.all([
      fetchAgenda(),
      fetchReservasForWeek(semanaInicio),
    ]);
    if (mounted.current) {
      setSlots(applyEffectiveStatus(template, reservas));
      setLoading(false);
    }
  };

  useEffect(() => {
    const mounted = { current: true };
    void reloadGrid(mounted);

    const agendaChannel = subscribeAgenda(() => {
      void reloadGrid(mounted);
    });
    const reservasChannel = subscribeReservas(semanaInicio, () => {
      void reloadGrid(mounted);
    });

    return () => {
      mounted.current = false;
      agendaChannel.unsubscribe();
      reservasChannel.unsubscribe();
    };
  }, [semanaInicio]);

  // ── Lookup map: "dia:hora" → slot ────────────────────────────────────────
  const slotMap = new Map<string, AgendaSlot>();
  for (const s of slots) {
    slotMap.set(`${s.dia_da_semana}:${s.hora_inicio}`, s);
  }

  // ── Client-mode helpers ──────────────────────────────────────────────────

  /**
   * Returns true if the slot at (dia, hora) can be the START of a valid block:
   * - All duracao consecutive hours on the same day are 'disponivel'
   * - Block does not exceed the 21h boundary
   */
  function isValidStart(dia: string, hora: number): boolean {
    if (hora + duracao - 1 > 21) return false;
    for (let h = hora; h < hora + duracao; h++) {
      const s = slotMap.get(`${dia}:${h}`);
      if (!s || s.status !== "disponivel") return false;
    }
    return true;
  }

  /** Returns the ordered block of slots starting at (dia, hora). */
  function getBlock(dia: string, hora: number): AgendaSlot[] {
    const block: AgendaSlot[] = [];
    for (let h = hora; h < hora + duracao; h++) {
      const s = slotMap.get(`${dia}:${h}`);
      if (s) block.push(s);
    }
    return block;
  }

  function handleClientSlotClick(slot: AgendaSlot) {
    if (!isValidStart(slot.dia_da_semana, slot.hora_inicio)) return;
    onSelect?.(getBlock(slot.dia_da_semana, slot.hora_inicio));
  }

  // ── Admin-mode bulk helpers ──────────────────────────────────────────────

  function handleBulkDay(dia: string) {
    const slotsForDay = slots.filter((s) => s.dia_da_semana === dia);
    if (!slotsForDay.some((s) => s.status !== "agendado")) return;
    const target = bulkTarget(slotsForDay);
    setSlots((prev) =>
      prev.map((s) =>
        s.dia_da_semana === dia && s.status !== "agendado" ? { ...s, status: target } : s,
      ),
    );
    onBulkDay?.(dia, slotsForDay);
  }

  function handleBulkHora(hora: number) {
    const slotsForHora = slots.filter((s) => s.hora_inicio === hora);
    if (!slotsForHora.some((s) => s.status !== "agendado")) return;
    const target = bulkTarget(slotsForHora);
    setSlots((prev) =>
      prev.map((s) =>
        s.hora_inicio === hora && s.status !== "agendado" ? { ...s, status: target } : s,
      ),
    );
    onBulkHora?.(hora, slotsForHora);
  }

  // ── Derived sets for O(1) lookup ─────────────────────────────────────────
  const selIdSet = new Set(selectedBlockIds ?? []);
  const selStart = selectedBlockIds?.[0] ?? null;

  if (loading) return <GridSkeleton mode={mode} />;

  const isAdmin = mode === "admin";

  const desktopGrid = (
    <div
      className={isAdmin ? "w-full overflow-x-auto" : "hidden md:block w-full overflow-x-auto"}
      onMouseLeave={() => {
        if (!isAdmin) {
          setHoveredDia(null);
          setHoveredHora(null);
        }
      }}
    >
      <div className="min-w-[540px]">
        <p className="mb-3 text-[10px] tracking-[0.14em] text-white/40 font-mono">
          Semana operacional: {formatWeekRange(semanaInicio)}
        </p>

        {/* ── Day header row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-8 gap-1 mb-1">
          <div />
          {DIAS.map((dia) => {
            if (!isAdmin) {
              return (
                <div
                  key={dia}
                  className="text-center text-[9px] tracking-widest text-white/50 font-semibold pb-1 leading-tight"
                >
                  {formatDayColumnLabel(dia, semanaInicio)}
                </div>
              );
            }
            const slotsForDay = slots.filter((s) => s.dia_da_semana === dia);
            const hasChangeable = slotsForDay.some((s) => s.status !== "agendado");
            const dayTarget = bulkTarget(slotsForDay);
            return (
              <button
                key={dia}
                type="button"
                disabled={!hasChangeable}
                title={hasChangeable ? (dayTarget === "bloqueado" ? `Bloquear toda ${DIAS_LABELS[dia]}` : `Liberar toda ${DIAS_LABELS[dia]}`) : undefined}
                onClick={() => handleBulkDay(dia)}
                className={[
                  "flex flex-col items-center gap-0.5 pb-1 rounded transition-all duration-150",
                  "text-[9px] tracking-widest font-semibold leading-tight",
                  hasChangeable
                    ? "text-white/50 hover:text-primary hover:bg-primary/10 cursor-pointer px-1"
                    : "text-white/20 cursor-default",
                ].join(" ")}
              >
                {formatDayColumnLabel(dia, semanaInicio)}
                {hasChangeable && <span className="text-[7px] text-white/20 leading-none">▼▲</span>}
              </button>
            );
          })}
        </div>

        {/* ── Hour rows ────────────────────────────────────────────────── */}
        {HORAS.map((h) => (
          <div key={h} className="grid grid-cols-8 gap-1 mb-1">

            {/* Time label */}
            {!isAdmin ? (
              <div className="flex items-center justify-end pr-2 text-[9px] text-white/30 font-mono">
                {String(h).padStart(2, "0")}h
              </div>
            ) : (() => {
              const slotsForHora = slots.filter((s) => s.hora_inicio === h);
              const hasChangeable = slotsForHora.some((s) => s.status !== "agendado");
              const horaTarget = bulkTarget(slotsForHora);
              return (
                <button
                  type="button"
                  disabled={!hasChangeable}
                  title={hasChangeable ? (horaTarget === "bloqueado" ? `Bloquear todas as ${String(h).padStart(2,"0")}:00` : `Liberar todas as ${String(h).padStart(2,"0")}:00`) : undefined}
                  onClick={() => handleBulkHora(h)}
                  className={[
                    "flex items-center justify-end pr-2 rounded transition-all duration-150 text-[9px] font-mono",
                    hasChangeable
                      ? "text-white/40 hover:text-primary hover:bg-primary/10 cursor-pointer"
                      : "text-white/15 cursor-default",
                  ].join(" ")}
                >
                  {String(h).padStart(2, "0")}h
                </button>
              );
            })()}

            {/* Slot buttons */}
            {DIAS.map((d) => {
              const slot = slotMap.get(`${d}:${h}`);
              const status: SlotStatus = slot?.status ?? "bloqueado";

              if (isAdmin) {
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => slot && onAdminToggle?.(slot)}
                    disabled={!slot || status === "agendado"}
                    title={
                      status === "agendado" ? "Horário já agendado"
                      : status === "bloqueado" ? "Clique para liberar"
                      : "Clique para bloquear"
                    }
                    className={adminSlotClass(status)}
                  />
                );
              }

              // ── CLIENT MODE ─────────────────────────────────────────────
              const inSelected = !!slot && selIdSet.has(slot.id);
              const isSelStart = !!slot && slot.id === selStart;

              const inHover =
                hoveredDia === d &&
                hoveredHora !== null &&
                h >= hoveredHora &&
                h < hoveredHora + duracao;
              const isHoverStart = inHover && h === hoveredHora;

              const valid = !!slot && status === "disponivel" && isValidStart(d, h);

              let clientState: ClientState;
              if (inSelected) {
                clientState = isSelStart ? "selectedStart" : "selectedBlock";
              } else if (inHover) {
                clientState = isHoverStart ? "hoverStart" : "hoverBlock";
              } else if (status === "agendado") {
                clientState = "agendado";
              } else if (valid) {
                clientState = "validStart";
              } else {
                clientState = status === "disponivel" ? "invalidStart" : "bloqueado";
              }

              const isClickable = valid;

              return (
                <button
                  key={d}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => slot && handleClientSlotClick(slot)}
                  onMouseEnter={() => {
                    if (valid) {
                      setHoveredDia(d);
                      setHoveredHora(h);
                    } else {
                      setHoveredDia(null);
                      setHoveredHora(null);
                    }
                  }}
                  title={
                    clientState === "validStart"
                      ? `Selecionar bloco de ${duracao}h a partir das ${String(h).padStart(2,"0")}:00`
                      : clientState === "agendado"
                        ? "Horário já agendado"
                        : undefined
                  }
                  className={clientSlotClass(clientState)}
                >
                  {isSelStart ? "✓" : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  if (isAdmin) {
    return (
      <>
        {desktopGrid}
        <Legend mode={mode} duracao={duracao} />
      </>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <AgendaClientMobile
          semanaInicio={semanaInicio}
          duracao={duracao}
          slotMap={slotMap}
          selectedBlockIds={selectedBlockIds}
          isValidStart={isValidStart}
          getBlock={getBlock}
          onSelect={onSelect}
        />
      </div>
      {desktopGrid}
      <Legend mode={mode} duracao={duracao} />
    </>
  );
}
