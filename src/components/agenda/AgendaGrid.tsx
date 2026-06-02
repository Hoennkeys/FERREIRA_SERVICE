"use client";

import { useEffect, useState } from "react";
import {
  DIAS,
  DIAS_LABELS,
  HORAS,
  fetchAgenda,
  subscribeAgenda,
  type AgendaSlot,
  type SlotStatus,
} from "@/lib/agenda";

// ── Slot color map ────────────────────────────────────────────────────────────

function slotClass(
  status: SlotStatus,
  isSelected: boolean,
  mode: "client" | "admin",
): string {
  const base =
    "flex items-center justify-center rounded border text-[10px] font-semibold tracking-wider transition-all duration-150 select-none h-9";

  if (isSelected) {
    return `${base} bg-cyan-400 border-cyan-300 text-black shadow-[0_0_16px_rgba(34,211,238,0.7)] scale-105 cursor-pointer`;
  }

  if (status === "disponivel") {
    const hover =
      mode === "client"
        ? "hover:bg-cyan-500/40 hover:border-cyan-400/70 hover:scale-105 cursor-pointer"
        : "hover:bg-cyan-500/40 hover:border-cyan-400/70 cursor-pointer";
    return `${base} bg-cyan-500/15 border-cyan-500/35 text-cyan-400 ${hover}`;
  }

  if (status === "bloqueado") {
    const hover =
      mode === "admin" ? "hover:bg-white/10 cursor-pointer" : "cursor-not-allowed";
    return `${base} bg-white/5 border-white/10 text-white/20 ${hover}`;
  }

  // agendado
  return `${base} bg-red-500/20 border-red-500/30 text-red-400 cursor-not-allowed`;
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="w-full overflow-x-auto">
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
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────

function Legend({ mode }: { mode: "client" | "admin" }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      <LegendItem color="bg-cyan-500/15 border-cyan-500/35" label="Disponível" />
      {mode === "client" && (
        <LegendItem color="bg-cyan-400 border-cyan-300" label="Selecionado" />
      )}
      <LegendItem color="bg-white/5 border-white/10" label="Bloqueado" />
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

// ── Main component ────────────────────────────────────────────────────────────

interface AgendaGridProps {
  mode: "client" | "admin";
  selectedId?: string | null;
  onSelect?: (slot: AgendaSlot) => void;
  onAdminToggle?: (slot: AgendaSlot) => void;
}

export function AgendaGrid({
  mode,
  selectedId,
  onSelect,
  onAdminToggle,
}: AgendaGridProps) {
  const [slots, setSlots] = useState<AgendaSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchAgenda().then((data) => {
      if (mounted) {
        setSlots(data);
        setLoading(false);
      }
    });

    const channel = subscribeAgenda((updated) => {
      if (!mounted) return;
      setSlots((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, status: updated.status } : s)),
      );
    });

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, []);

  // Build lookup: dia -> hora -> slot
  const slotMap = new Map<string, AgendaSlot>();
  for (const s of slots) {
    slotMap.set(`${s.dia_da_semana}:${s.hora_inicio}`, s);
  }

  function handleClick(slot: AgendaSlot | undefined) {
    if (!slot) return;

    if (mode === "client") {
      if (slot.status !== "disponivel") return;
      onSelect?.(slot);
    } else {
      if (slot.status === "agendado") return;
      onAdminToggle?.(slot);
    }
  }

  if (loading) return <GridSkeleton />;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[540px]">
        {/* Header row */}
        <div className="grid grid-cols-8 gap-1 mb-1">
          <div />
          {DIAS.map((d) => (
            <div
              key={d}
              className="text-center text-[9px] tracking-widest text-white/50 font-semibold pb-1"
            >
              {DIAS_LABELS[d]}
            </div>
          ))}
        </div>

        {/* Hour rows */}
        {HORAS.map((h) => (
          <div key={h} className="grid grid-cols-8 gap-1 mb-1">
            {/* Time label */}
            <div className="flex items-center justify-end pr-2 text-[9px] text-white/30 font-mono">
              {String(h).padStart(2, "0")}h
            </div>

            {DIAS.map((d) => {
              const slot = slotMap.get(`${d}:${h}`);
              const status: SlotStatus = slot?.status ?? "bloqueado";
              const isSelected = !!slot && slot.id === selectedId;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleClick(slot)}
                  disabled={
                    !slot ||
                    (mode === "client" && status !== "disponivel") ||
                    (mode === "admin" && status === "agendado")
                  }
                  title={
                    status === "agendado"
                      ? "Horário já agendado"
                      : status === "bloqueado" && mode === "admin"
                        ? "Clique para liberar"
                        : status === "disponivel" && mode === "admin"
                          ? "Clique para bloquear"
                          : undefined
                  }
                  className={slotClass(status, isSelected, mode)}
                >
                  {isSelected ? "✓" : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <Legend mode={mode} />
    </div>
  );
}
