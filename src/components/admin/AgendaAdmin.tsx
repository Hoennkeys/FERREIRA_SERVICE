import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { AgendaGrid } from "@/components/agenda/AgendaGrid";
import { bulkToggle, toggleAdminSlot, type AgendaSlot } from "@/lib/agenda";

export function AgendaAdmin() {
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Individual slot toggle ────────────────────────────────────────────────

  async function handleToggle(slot: AgendaSlot) {
    if (slot.status === "agendado") return;
    setSaving(true);
    await toggleAdminSlot(slot.id, slot.status);
    setSaving(false);
  }

  // ── Bulk: entire day column ───────────────────────────────────────────────

  async function handleBulkDay(_dia: string, slotsForDay: AgendaSlot[]) {
    setSaving(true);
    await bulkToggle(slotsForDay);
    setSaving(false);
  }

  // ── Bulk: entire hour row ─────────────────────────────────────────────────

  async function handleBulkHora(_hora: number, slotsForHora: AgendaSlot[]) {
    setSaving(true);
    await bulkToggle(slotsForHora);
    setSaving(false);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-[10px] tracking-[0.22em] text-primary font-semibold">
              AGENDA
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Verde = disponível · Cinza = bloqueado · Vermelho = agendado
            </p>
          </div>
        </div>

        <div className="text-white/30 group-hover:text-white/60 transition">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div
          className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-6"
          style={{ animation: "fade-up 0.2s ease-out" }}
        >
          {/* Admin instructions */}
          <div className="mb-4 rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 space-y-1.5">
            <p className="text-[11px] text-white/60 font-medium">Como usar:</p>
            <ul className="text-[11px] text-white/45 leading-relaxed space-y-1 list-none">
              <li>
                <span className="text-cyan-400 font-medium">Slot individual</span> — clique
                diretamente no quadrado para alternar disponível ↔ bloqueado.
              </li>
              <li>
                <span className="text-primary font-medium">Coluna inteira (dia)</span> — clique
                no <span className="font-semibold text-white/60">nome do dia</span> no topo
                (SEG, TER…) para bloquear ou liberar todos os horários daquele dia de uma vez.
              </li>
              <li>
                <span className="text-primary font-medium">Linha inteira (hora)</span> — clique
                no <span className="font-semibold text-white/60">horário lateral</span> (07h,
                08h…) para bloquear ou liberar aquele horário em todos os dias da semana.
              </li>
              <li>
                Slots <span className="text-red-400 font-medium">vermelhos</span> já foram
                agendados e não podem ser alterados.
              </li>
            </ul>
          </div>

          {saving && (
            <div className="mb-3 flex items-center gap-2 text-[11px] text-primary/70">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              Salvando…
            </div>
          )}

          <AgendaGrid
            mode="admin"
            onAdminToggle={handleToggle}
            onBulkDay={handleBulkDay}
            onBulkHora={handleBulkHora}
          />
        </div>
      )}
    </section>
  );
}
