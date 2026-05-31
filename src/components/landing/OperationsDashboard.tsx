import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { parseTelemetry, type Telemetry } from "@/lib/schemas/telemetry";
import { Reveal } from "./Reveal";

const TWITCH_URL = "https://twitch.tv/ferreiranavoz";
const START = Date.now();
const INITIAL_TELEMETRY: Telemetry = {
  uptime: "00:00:00",
  xph: 2_450_000,
  deaths: 0,
};

function formatUptime(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export function OperationsDashboard() {
  const [telemetry, setTelemetry] = useState<Telemetry>(INITIAL_TELEMETRY);

  useEffect(() => {
    const id = setInterval(() => {
      setTelemetry((prev) => {
        const candidate = {
          uptime: formatUptime(Date.now() - START),
          xph: prev.xph + Math.floor((Math.random() - 0.4) * 3000),
          deaths: prev.deaths,
        };
        return parseTelemetry(candidate) ?? prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 rounded-full bg-green-400"
                  style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                />
                <span className="text-[10px] sm:text-xs font-medium tracking-[0.18em] text-white/80">
                  ● SYSTEM OPERATIONS ACTIVE
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
              </div>
            </div>

            {/* Body grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <Stat label="UPTIME" value={telemetry.uptime} mono />
              <Stat
                label="XP / HOUR"
                value={telemetry.xph.toLocaleString("pt-BR")}
                accent
              />
              <Stat label="DEATHS" value={String(telemetry.deaths)} />
            </div>

            {/* Chart */}
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
                {/* grid */}
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

            {/* CTA */}
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

function Stat({
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
}
