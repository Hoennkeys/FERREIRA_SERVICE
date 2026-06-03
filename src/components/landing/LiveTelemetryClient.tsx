import { memo } from "react";

import { useLiveSession } from "@/lib/live-session";
import type { SessionSummary } from "@/lib/live-session";
import { useTelemetryTimer } from "@/hooks/use-telemetry-timer";
import { useTwitchLive } from "@/hooks/use-twitch-live";
import { Reveal } from "./Reveal";
import { TwitchLiveEmbed } from "./TwitchLiveEmbed";
import { TwitchWatchButton } from "./TwitchWatchButton";

const xpFormatter = new Intl.NumberFormat("pt-BR");

function formatDuration(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatViewers(count: number): string {
  return xpFormatter.format(count);
}

export function LiveTelemetryClient() {
  const session = useLiveSession();
  const { uptime, xpFormatted } = useTelemetryTimer(session);
  const { data: twitch, isLoading: twitchLoading } = useTwitchLive();

  const twitchLive = twitch?.isLive === true;
  const opsActive = session.is_active;
  /** API configurada = credenciais no .env / Vercel */
  const twitchApiConfigured = twitch?.configured === true;
  /** Sem API: mostra o player mesmo assim (embed funciona sem Helix) */
  const showPlayer = opsActive || twitchLive || !twitchApiConfigured;
  const showSetupHint = twitch !== undefined && !twitchApiConfigured;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Reveal>
          {opsActive ? (
            <ActiveCard
              uptime={uptime}
              xpFormatted={xpFormatted}
              isPaused={session.is_paused}
              twitchLive={twitchLive}
              streamTitle={twitch?.title}
            />
          ) : showPlayer ? (
            <TwitchStreamCard
              streamTitle={twitch?.title}
              viewerCount={twitch?.viewerCount}
              checking={twitchLoading && !twitch && twitchApiConfigured}
              showSetupHint={showSetupHint}
            />
          ) : (
            <OfflineCard
              summary={session.last_session_summary}
              twitchError={twitch?.error}
            />
          )}
        </Reveal>
      </div>
    </section>
  );
}

function LiveStreamBlock({
  streamTitle,
  viewerCount,
}: {
  streamTitle?: string;
  viewerCount?: number;
}) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[10px] tracking-[0.18em] text-white/40">
        TRANSMISSÃO AO VIVO
      </p>
      {streamTitle && (
        <p className="mb-2 text-xs text-white/55 line-clamp-2">{streamTitle}</p>
      )}
      <TwitchLiveEmbed />
      {viewerCount != null && viewerCount > 0 && (
        <p className="mt-2 text-[10px] text-white/40">
          {formatViewers(viewerCount)} espectadores na Twitch
        </p>
      )}
    </div>
  );
}

const ActiveCard = memo(function ActiveCard({
  uptime,
  xpFormatted,
  isPaused,
  twitchLive,
  streamTitle,
}: {
  uptime: string;
  xpFormatted: string;
  isPaused: boolean;
  twitchLive: boolean;
  streamTitle?: string;
}) {
  const statusLabel = isPaused
    ? "SERVIÇO PAUSADO"
    : twitchLive
      ? "LIVE - SERVIÇO EM ANDAMENTO"
      : "SERVIÇO EM ANDAMENTO (SEM LIVE NA TWITCH)";

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
            {statusLabel}
          </span>
        </div>
        <TwitchWatchButton label="Abrir na Twitch" />
      </div>

      <LiveStreamBlock streamTitle={streamTitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <CompactStat label="UPTIME" value={uptime} />
        <CompactStat label="XP ACUMULADA" value={xpFormatted} accent />
      </div>
    </div>
  );
});

const TwitchStreamCard = memo(function TwitchStreamCard({
  streamTitle,
  viewerCount,
  checking,
  showSetupHint,
}: {
  streamTitle?: string;
  viewerCount?: number;
  checking: boolean;
  showSetupHint: boolean;
}) {
  return (
    <div
      className="glass rounded-2xl p-5 sm:p-7 shadow-[0_0_60px_rgba(145,70,255,0.12)] border-[#9146ff]/25"
      style={{ animation: "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full bg-[#9146ff]"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          />
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-[#bf94ff]">
            {checking
              ? "VERIFICANDO LIVE NA TWITCH…"
              : showSetupHint
                ? "CANAL TWITCH"
                : "AO VIVO NA TWITCH"}
          </span>
        </div>
        <TwitchWatchButton label="Abrir na Twitch" />
      </div>

      {showSetupHint ? (
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
          Para o site detectar sozinho quando você entra ao vivo, preencha{" "}
          <span className="font-mono">TWITCH_CLIENT_ID</span> e{" "}
          <span className="font-mono">TWITCH_CLIENT_SECRET</span> no arquivo{" "}
          <span className="font-mono">.env</span> (local) ou no Vercel
          (produção) e reinicie o servidor. O player abaixo já funciona sem
          isso.
        </p>
      ) : (
        <p className="mt-3 text-sm text-white/50 leading-relaxed">
          Transmissão detectada automaticamente. O cronômetro de serviço aparece
          quando a operação for iniciada no painel.
        </p>
      )}

      <LiveStreamBlock streamTitle={streamTitle} viewerCount={viewerCount} />
    </div>
  );
});

const OfflineCard = memo(function OfflineCard({
  summary,
  twitchError,
}: {
  summary: SessionSummary | null;
  twitchError?: string;
}) {
  return (
    <div
      className="glass rounded-2xl p-5 sm:p-7"
      style={{ animation: "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <span className="text-[10px] sm:text-xs font-medium tracking-[0.18em] text-white/45">
            STATUS: OFFLINE NA TWITCH
          </span>
        </div>
        <TwitchWatchButton />
      </div>

      <p className="mt-3 text-sm text-white/50 leading-relaxed">
        Quando você entrar ao vivo na Twitch, a transmissão aparece aqui
        automaticamente. O cronômetro de serviço liga ao iniciar a operação no
        painel.
      </p>

      {twitchError && (
        <p className="mt-3 text-[11px] text-red-400/80">
          Não foi possível consultar a Twitch ({twitchError}). Tente atualizar a
          página em instantes.
        </p>
      )}

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
