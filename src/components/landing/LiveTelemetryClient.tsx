import { memo } from "react";
import { ExternalLink, Radio } from "lucide-react";

import { useLiveSession } from "@/lib/live-session";
import type { SessionSummary } from "@/lib/live-session";
import { useTelemetryTimer } from "@/hooks/use-telemetry-timer";
import { Reveal } from "./Reveal";

const TWITCH_URL = "https://twitch.tv/ferreiranavoz";
const xpFormatter = new Intl.NumberFormat("pt-BR");

function formatDuration(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function LiveTelemetryClient() {
  const session = useLiveSession();
  const { uptime, xpFormatted } = useTelemetryTimer(session);

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Reveal>
          {session.is_active ? (
            <ActiveCard
              uptime={uptime}
              xpFormatted={xpFormatted}
              isPaused={session.is_paused}
            />
          ) : (
            <OfflineCard summary={session.last_session_summary} />
          )}
        </Reveal>
      </div>
    </section>
  );
}

const ActiveCard = memo(function ActiveCard({
  uptime,
  xpFormatted,
  isPaused,
}: {
  uptime: string;
  xpFormatted: string;
  isPaused: boolean;
}) {
  return (
    <div
      className="glass rounded-2xl p-5 sm:p-7 shadow-[0_0_60px_rgba(0,149,255,0.1)] border-primary/20"
      style={{ animation: "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${isPaused ? "bg-amber-400" : "bg-green-400"}`}
            style={
              isPaused
                ? undefined
                : { animation: "pulse-dot 2s ease-in-out infinite" }
            }
          />
          <span
            className={`text-[10px] sm:text-xs font-semibold tracking-[0.18em] ${
              isPaused ? "text-amber-400" : "text-green-400"
            }`}
          >
            {isPaused
              ? "SERVIÇO PAUSADO"
              : "LIVE - SERVIÇO EM ANDAMENTO"}
          </span>
        </div>
        <a
          href={TWITCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-[11px] sm:text-xs font-medium text-white/90 transition hover:border-primary/50 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_30px_rgba(0,149,255,0.3)]"
        >
          <Radio className="h-3.5 w-3.5" />
          Assistir ao Vivo
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <CompactStat label="UPTIME" value={uptime} />
        <CompactStat label="XP ACUMULADA" value={xpFormatted} accent />
      </div>
    </div>
  );
});

const OfflineCard = memo(function OfflineCard({
  summary,
}: {
  summary: SessionSummary | null;
}) {
  return (
    <div
      className="glass rounded-2xl p-5 sm:p-7"
      style={{ animation: "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="text-[10px] sm:text-xs font-medium tracking-[0.18em] text-white/45">
          STATUS DA OPERAÇÃO: AGUARDANDO PRÓXIMO SERVIÇO
        </span>
      </div>

      <p className="mt-3 text-sm text-white/50 leading-relaxed">
        O operador está em standby. Acompanhe aqui quando o próximo serviço
        entrar ao vivo.
      </p>

      {summary && (
        <div className="mt-5 rounded-xl border border-white/5 bg-black/40 p-4">
          <div className="text-[10px] tracking-[0.18em] text-white/40">
            ÚLTIMO SERVIÇO
          </div>
          <div className="mt-2 font-mono text-sm sm:text-base text-white/80 tabular-nums">
            Duração{" "}
            <span className="text-white">
              {formatDuration(summary.total_time_seconds)}
            </span>{" "}
            <span className="text-white/30">|</span> XP Obtida{" "}
            <span className="text-primary drop-shadow-[0_0_10px_rgba(0,149,255,0.4)]">
              {xpFormatter.format(summary.total_xp_gained)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

const CompactStat = memo(function CompactStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/40 p-4">
      <div className="text-[10px] tracking-[0.18em] text-white/40">{label}</div>
      <div
        className={`mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-semibold ${
          accent
            ? "text-primary drop-shadow-[0_0_12px_rgba(0,149,255,0.5)]"
            : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
});
