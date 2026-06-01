import { memo, useEffect, useState } from "react";
import { ExternalLink, Pause, Play, RotateCcw, Square } from "lucide-react";

import {
  liveSessionStore,
  useLiveSession,
  DEFAULT_BASE_XP_HOUR,
} from "@/lib/live-session";
import { useTelemetryTimer } from "@/hooks/use-telemetry-timer";
import { Reveal } from "./Reveal";

const TWITCH_URL = "https://twitch.tv/ferreiranavoz";

export function OperationsDashboard() {
  const session = useLiveSession();
  const { uptime, xpFormatted } = useTelemetryTimer(session);

  const [baseXpInput, setBaseXpInput] = useState(String(DEFAULT_BASE_XP_HOUR));

  useEffect(() => {
    if (session.is_active) {
      setBaseXpInput(String(session.base_xp_hour));
    }
  }, [session.is_active, session.base_xp_hour]);

  const handleStart = () => {
    const parsed = Number(baseXpInput.replace(/\D/g, ""));
    void liveSessionStore.startSession({
      baseXpHour: Number.isFinite(parsed) ? parsed : DEFAULT_BASE_XP_HOUR,
    });
  };

  const handlePause = () => {
    void liveSessionStore.pauseSession();
  };

  const handleResume = () => {
    void liveSessionStore.resumeSession();
  };

  const handleReset = () => {
    void liveSessionStore.resetSession();
  };

  const handleEnd = () => {
    void liveSessionStore.endSession();
  };

  const statusLabel = session.is_active
    ? session.is_paused
      ? "◌ SYSTEM OPERATIONS PAUSED"
      : "● SYSTEM OPERATIONS ACTIVE"
    : "○ OPERATIONS STANDBY";

  const statusDotClass = session.is_active
    ? session.is_paused
      ? "bg-amber-400"
      : "bg-green-400"
    : "bg-white/25";

  return (
    <section className="py-12 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="text-center mb-8">
            <span className="text-[10px] sm:text-xs font-medium tracking-[0.22em] text-white/40">
              LIVE OPERATIONS DASHBOARD
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Telemetria em tempo real.
            </h2>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="glass rounded-2xl p-4 sm:p-6 shadow-[0_0_60px_rgba(0,149,255,0.08)]">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 rounded-full ${statusDotClass}`}
                  style={
                    session.is_active && !session.is_paused
                      ? { animation: "pulse-dot 2s ease-in-out infinite" }
                      : undefined
                  }
                />
                <span className="text-[10px] sm:text-xs font-medium tracking-[0.18em] text-white/80">
                  {statusLabel}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <Stat label="UPTIME" value={uptime} mono />
              <Stat label="XP / HOUR" value={xpFormatted} accent mono />
              <Stat label="DEATHS" value="0" />
            </div>

            <div className="mt-5 rounded-xl border border-white/5 bg-black/40 p-4 sm:p-5">
              <div className="text-[10px] tracking-[0.18em] text-white/40">
                CONTROLE DE OPERAÇÃO
              </div>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-3">
                <label className="flex-1 block">
                  <span className="text-[10px] tracking-[0.18em] text-white/50">
                    XP / HORA BASE
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={baseXpInput}
                    onChange={(e) => setBaseXpInput(e.target.value)}
                    disabled={session.is_active}
                    placeholder="Ex: 80000"
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-white/25 outline-none transition focus:border-primary/60 focus:shadow-[0_0_20px_rgba(0,149,255,0.2)] disabled:opacity-40"
                  />
                </label>

                {!session.is_active ? (
                  <button
                    type="button"
                    onClick={handleStart}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-400/40 bg-green-500/10 px-5 py-2.5 text-xs font-semibold tracking-[0.14em] text-green-300 transition hover:bg-green-500/20 hover:shadow-[0_0_24px_rgba(34,197,94,0.3)]"
                  >
                    <Play className="h-3.5 w-3.5" />
                    INICIAR SERVIÇO
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {session.is_paused ? (
                      <button
                        type="button"
                        onClick={handleResume}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-2.5 text-xs font-semibold tracking-[0.14em] text-green-300 transition hover:bg-green-500/20"
                      >
                        <Play className="h-3.5 w-3.5" />
                        RETOMAR
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePause}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold tracking-[0.14em] text-amber-300 transition hover:bg-amber-500/20"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        PAUSAR
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold tracking-[0.14em] text-white/70 transition hover:border-white/25 hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      RESET
                    </button>
                    <button
                      type="button"
                      onClick={handleEnd}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-xs font-semibold tracking-[0.14em] text-red-300 transition hover:bg-red-500/20 hover:shadow-[0_0_24px_rgba(248,113,113,0.25)]"
                    >
                      <Square className="h-3.5 w-3.5" />
                      FINALIZAR
                    </button>
                  </div>
                )}
              </div>

              {session.last_session_summary && !session.is_active && (
                <p className="mt-3 font-mono text-[11px] text-white/40 tabular-nums">
                  // último serviço:{" "}
                  {formatDuration(
                    session.last_session_summary.total_time_seconds,
                  )}{" "}
                  · {session.last_session_summary.total_xp_gained.toLocaleString("pt-BR")} XP
                </p>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-[0.18em] text-white/40">
                  XP/HOUR GAIN — LAST 24H
                </span>
                <span className="text-[10px] tracking-[0.18em] text-primary">+12.4%</span>
              </div>
              <svg viewBox="0 0 600 140" className="w-full h-28 sm:h-36" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(0,149,255,0.35)" />
                    <stop offset="100%" stopColor="rgba(0,149,255,0)" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    x2="600"
                    y1={20 + i * 35}
                    y2={20 + i * 35}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}
                <path
                  d="M0,110 L40,95 L80,100 L120,80 L160,85 L200,65 L240,72 L280,55 L320,60 L360,42 L400,48 L440,32 L480,38 L520,22 L560,28 L600,15 L600,140 L0,140 Z"
                  fill="url(#lineFill)"
                />
                <path
                  d="M0,110 L40,95 L80,100 L120,80 L160,85 L200,65 L240,72 L280,55 L320,60 L360,42 L400,48 L440,32 L480,38 L520,22 L560,28 L600,15"
                  fill="none"
                  stroke="#0095FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="1000"
                  style={{
                    animation: "chart-draw 2.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                    filter: "drop-shadow(0 0 6px rgba(0,149,255,0.6))",
                  }}
                />
              </svg>
            </div>

            <div className="mt-6 flex justify-center">
              <a
                href={TWITCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-5 py-2.5 text-xs sm:text-sm font-medium text-white/90 transition hover:border-primary/50 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_30px_rgba(0,149,255,0.3)]"
              >
                Interromper Simulação e Ir para a Live (Twitch)
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function formatDuration(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const Stat = memo(function Stat({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/40 p-4">
      <div className="text-[10px] tracking-[0.18em] text-white/40">{label}</div>
      <div
        className={`mt-2 text-xl sm:text-2xl font-semibold ${
          accent ? "text-primary drop-shadow-[0_0_12px_rgba(0,149,255,0.5)]" : "text-white"
        } ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </div>
    </div>
  );
});
