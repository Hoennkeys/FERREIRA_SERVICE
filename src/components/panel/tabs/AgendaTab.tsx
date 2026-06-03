import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { AgendaGrid } from "@/components/agenda/AgendaGrid";
import {
  bulkToggle,
  repairLegacyAgendadoSlots,
  repairOrphanReservas,
  toggleAdminSlot,
  type AgendaSlot,
} from "@/lib/agenda";

export function AgendaTab() {
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void repairLegacyAgendadoSlots();
    void repairOrphanReservas();
  }, []);

  async function handleToggle(slot: AgendaSlot) {
    if (slot.status === "agendado") return;
    setSaving(true);
    await toggleAdminSlot(slot.id, slot.status);
    setSaving(false);
  }

  async function handleBulkDay(_dia: string, slotsForDay: AgendaSlot[]) {
    setSaving(true);
    await bulkToggle(slotsForDay);
    setSaving(false);
  }

  async function handleBulkHora(_hora: number, slotsForHora: AgendaSlot[]) {
    setSaving(true);
    await bulkToggle(slotsForHora);
    setSaving(false);
  }

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <CalendarDays className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-primary">
            AGENDA
          </p>
          <p className="mt-0.5 text-xs text-white/40">
            Verde = disponível · Cinza = bloqueado · Vermelho = agendado
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-4 sm:p-6">
        <div className="mb-4 space-y-1.5 rounded-lg border border-zinc-800 bg-[#0d0d10] px-4 py-3">
          <p className="text-[11px] font-medium text-white/60">Como usar:</p>
          <ul className="list-none space-y-1 text-[11px] leading-relaxed text-white/45">
            <li>
              <span className="font-medium text-cyan-400">Slot individual</span> — clique
              diretamente no quadrado para alternar disponível ↔ bloqueado.
            </li>
            <li>
              <span className="font-medium text-primary">Coluna inteira (dia)</span> — clique
              no <span className="font-semibold text-white/60">nome do dia</span> no topo
              (SEG, TER…) para bloquear ou liberar todos os horários daquele dia de uma vez.
            </li>
            <li>
              <span className="font-medium text-primary">Linha inteira (hora)</span> — clique
              no <span className="font-semibold text-white/60">horário lateral</span> (07h,
              08h…) para bloquear ou liberar aquele horário em todos os dias da semana.
            </li>
            <li>
              Slots <span className="font-medium text-red-400">vermelhos</span> já foram
              agendados e não podem ser alterados.
            </li>
          </ul>
        </div>

        {saving && (
          <div className="mb-3 flex items-center gap-2 text-[11px] text-primary/70">
            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
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
    </section>
  );
}
