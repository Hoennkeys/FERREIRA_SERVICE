import { useMemo, useState } from "react";
import { Receipt, Send, Swords, Trash2 } from "lucide-react";

import type { ClientPayment, HuntSession } from "@/lib/hunt/api";
import { formatDuration } from "@/lib/hunt/parse";
import { fmtHours } from "@/lib/hunt/report";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "all";
type Kind = "all" | "hunt" | "payment";
type Item =
  | { kind: "hunt"; id: string; date: string; h: HuntSession }
  | { kind: "payment"; id: string; date: string; p: ClientPayment };

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "all", label: "Tudo" },
];
const KINDS: { id: Kind; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "hunt", label: "⚔️ Hunts" },
  { id: "payment", label: "🧾 Pagamentos" },
];

function periodStart(p: Period): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // segunda-feira
  if (p === "month") d.setDate(1);
  return p === "all" ? 0 : d.getTime();
}

const chip = (active: boolean) =>
  cn(
    "rounded-lg border px-3 py-1.5 text-xs transition",
    active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-white/50 hover:text-white/80",
  );

export function HuntGallery({
  hunts, payments, urls, onSend, onDelete,
}: {
  hunts: HuntSession[];
  payments: ClientPayment[];
  urls: Record<string, string>;
  onSend: (h: HuntSession) => void;
  onDelete: (it: Item) => void;
}) {
  const [period, setPeriod] = useState<Period>("week");
  const [kind, setKind] = useState<Kind>("all");

  const groups = useMemo(() => {
    const from = periodStart(period);
    const items: Item[] = [
      ...(kind !== "payment" ? hunts.map((h) => ({ kind: "hunt" as const, id: h.id, date: h.session_date, h })) : []),
      ...(kind !== "hunt" ? payments.map((p) => ({ kind: "payment" as const, id: p.id, date: p.date, p })) : []),
    ]
      .filter((i) => +new Date(i.date) >= from)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

    const map = new Map<string, Item[]>();
    for (const it of items) {
      const key = new Date(it.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return [...map.entries()];
  }, [hunts, payments, period, kind]);

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Galeria &amp; Histórico</h2>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">{PERIODS.map((p) => <button key={p.id} className={chip(period === p.id)} onClick={() => setPeriod(p.id)}>{p.label}</button>)}</div>
          <div className="flex gap-1">{KINDS.map((k) => <button key={k.id} className={chip(kind === k.id)} onClick={() => setKind(k.id)}>{k.label}</button>)}</div>
        </div>
      </div>

      {groups.length === 0 && <p className="text-xs text-white/40">Nenhum registro neste filtro.</p>}

      {groups.map(([day, items]) => {
        const dayHunts = items.filter((i): i is Extract<Item, { kind: "hunt" }> => i.kind === "hunt").map((i) => i.h);
        const secs = dayHunts.reduce((a, h) => a + h.duration_seconds, 0);
        const profit = dayHunts.reduce((a, h) => a + h.profit_balance, 0);
        const xp = dayHunts.reduce((a, h) => a + (h.xp_gained ?? 0), 0);
        return (
          <div key={day} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-1">
              <p className="text-xs font-semibold capitalize text-emerald-400">{day}</p>
              {dayHunts.length > 0 && (
                <p className="text-[11px] text-white/40">
                  {dayHunts.length} sessões · {fmtHours(secs / 3600)} · {xp.toLocaleString("pt-BR")} xp ·{" "}
                  <span className={profit >= 0 ? "text-[#00FF66]" : "text-red-400"}>{profit.toLocaleString("pt-BR")} gp</span>
                </p>
              )}
            </div>
            {items.map((it) => {
              const img = it.kind === "hunt" ? it.h.stopwatch_image_url : it.p.proof_image_url;
              return (
                <div key={it.kind + it.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#0d0d10] p-3">
                  {img && urls[img] ? (
                    <a href={urls[img]} target="_blank" rel="noreferrer"><img src={urls[img]} alt="" className="h-14 w-20 rounded object-cover" /></a>
                  ) : (
                    <div className="flex h-14 w-20 items-center justify-center rounded bg-zinc-900">
                      {it.kind === "hunt" ? <Swords className="h-5 w-5 text-white/20" /> : <Receipt className="h-5 w-5 text-white/20" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-[10px] tracking-wider text-white/40">{new Date(it.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    {it.kind === "hunt" ? (
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                            {it.h.service_type === "treino"
                              ? "🛡️ Treino"
                              : it.h.service_type === "quebra"
                              ? "🔨 Quebra de Itens"
                              : it.h.service_type === "custom"
                              ? "✨ Personalizado"
                              : "⚔️ Hunt"}
                          </span>
                          {it.h.hourly_rate && (
                            <span className="text-[10px] text-white/50">
                              (R$ {Number(it.h.hourly_rate).toFixed(2)}/h · R$ {(it.h.cost_reais ?? (it.h.duration_seconds / 3600 * it.h.hourly_rate)).toFixed(2)})
                            </span>
                          )}
                        </div>
                        <p className="text-white">
                          ⏱️ {formatDuration(it.h.duration_seconds)}
                          {it.h.service_type === "hunt" || (!it.h.service_type && (it.h.exp_per_hour > 0 || it.h.profit_balance !== 0)) ? (
                            <> · {it.h.exp_per_hour.toLocaleString("pt-BR")} exp/h · {(it.h.xp_gained ?? 0).toLocaleString("pt-BR")} xp · lucro {it.h.profit_balance.toLocaleString("pt-BR")} gp</>
                          ) : it.h.notes ? (
                            <> · <span className="text-white/60">{it.h.notes}</span></>
                          ) : null}
                        </p>
                      </div>
                    ) : (
                      <p className="text-emerald-300">🧾 R$ {it.p.amount_paid.toFixed(2)} · +{fmtHours(it.p.hours_credited)}</p>
                    )}
                  </div>
                  {it.kind === "hunt" && (
                    <button title="Enviar no WhatsApp" className="text-white/40 hover:text-emerald-400" onClick={() => onSend(it.h)}>
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                  <button title="Excluir" className="text-white/30 hover:text-red-400" onClick={() => onDelete(it)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
