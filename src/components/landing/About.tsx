import { Twitch, Instagram } from "lucide-react";
import { Reveal } from "./Reveal";
import { useTwitchStatus } from "@/hooks/use-twitch-status";
import ferreiraPerfil from "@/assets/ferreira-perfil.jpg";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const SOCIALS = [
  {
    id: "twitch",
    label: "Twitch",
    href: "https://www.twitch.tv/ferreiranavoz",
    icon: Twitch,
    color: "#6441a5",
    handle: "Ferreira na Voz",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/ferreiranavoz",
    icon: Instagram,
    color: "#e1306c",
    handle: "@ferreiranavoz",
  },
  {
    id: "discord",
    label: "Discord",
    href: "https://discord.gg/wvQwEpmYX",
    icon: DiscordIcon,
    color: "#5865F2",
    handle: "Ferreira Services Discord",
  },
] as const;

export function About() {
  const { isLive, loading } = useTwitchStatus();
  const showLive = !loading && isLive;

  return (
    <section id="sobre" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          <div className="lg:col-span-5">
            <Reveal>
              <span className="text-[10px] font-medium tracking-[0.22em] text-white/40">
                OPERATOR PROFILE // FERREIRA!
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white leading-[1.1]">
                Alta Performance.{" "}
                <span className="text-primary drop-shadow-[0_0_20px_rgba(0,149,255,0.4)]">
                  Mais de 15k Horas de Service.
                </span>{" "}
                Segurança Absoluta.
              </h2>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 text-sm text-white/65 leading-relaxed">
                Eu sou o Ferreira e tenho mais de 15 mil horas
                dentro do Tibia — das versões 7.4, 8.1, 8.6, 10, 15 e Global. Não aprendi o jogo
                em teoria: vivi cada meta, cada reset e cada risco de hunt na prática, e foi
                isso que me levou a transformar essa experiência em service de verdade.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <p className="mt-4 text-sm text-white/65 leading-relaxed">
                Sei o valor do tempo que você investiu no seu boneco, por isso trato cada sessão
                de service como se fosse na minha própria conta — com cuidado, atenção e zero
                improviso. Segurança não é promessa de marketing aqui; é o jeito que eu opero
                quando alguém confia o personagem nas minhas mãos.
              </p>
            </Reveal>

            <Reveal delay={280}>
              <p className="mt-4 text-sm text-white/65 leading-relaxed">
                Atendimento direto, sem intermediários. Do onboarding via WhatsApp à conclusão da
                missão, você tem acesso total à linha de comando da operação.
              </p>
            </Reveal>
          </div>

          <Reveal delay={200} className="lg:col-span-3 flex justify-center">
            <div className="relative w-full max-w-[220px] sm:max-w-[260px] mx-auto">
              <div
                aria-hidden
                className="operator-halo absolute -inset-3 rounded-xl animate-pulse pointer-events-none"
              />
              <div className="relative glass operator-frame p-2.5 sm:p-3">
                <img
                  src={ferreiraPerfil}
                  alt="Ferreira — Operator Profile"
                  className="w-full aspect-[3/4] object-cover rounded-xl"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-4">
            <div
              className={`glass rounded-2xl p-6 sm:p-7 transition-all duration-700 ${
                showLive
                  ? "border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)] animate-pulse"
                  : "border-white/10 shadow-[0_0_40px_rgba(0,149,255,0.06)]"
              }`}
            >
              <div className="flex items-center gap-2 mb-6">
                {showLive ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                    <span className="text-[10px] font-medium tracking-[0.2em] text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                      OPERATOR IN LIVE // TRANSMISSION ACTIVE
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                    <span className="text-[10px] font-medium tracking-[0.2em] text-emerald-400">
                      SYSTEM ONLINE // DISPATCH READY
                    </span>
                  </>
                )}
              </div>

              <p className="text-[10px] font-medium tracking-[0.18em] text-white/35 mb-3">
                REDES SOCIAIS
              </p>

              <div className="space-y-2.5">
                {SOCIALS.map(({ id, label, href, icon: Icon, color, handle }) => {
                  const isTwitch = id === "twitch";
                  const liveTwitchHighlight = showLive && isTwitch;

                  return (
                    <a
                      key={id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-3.5 w-full rounded-xl border px-4 py-3 transition-all duration-200 hover:border-white/20 ${
                        liveTwitchHighlight
                          ? "border-emerald-500/50 animate-pulse shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                          : "border-white/10"
                      }`}
                      style={{
                        backgroundColor: `color-mix(in srgb, ${color} 5%, transparent)`,
                      }}
                      onMouseEnter={(e) => {
                        if (liveTwitchHighlight) return;
                        (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${color} 30%, transparent)`;
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px color-mix(in srgb, ${color} 12%, transparent)`;
                      }}
                      onMouseLeave={(e) => {
                        if (liveTwitchHighlight) return;
                        (e.currentTarget as HTMLElement).style.borderColor = "";
                        (e.currentTarget as HTMLElement).style.boxShadow = "";
                      }}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 text-white/50 transition group-hover:text-white/80"
                        style={{ color: `color-mix(in srgb, ${color} 70%, white)` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white/80 group-hover:text-white transition">
                          {label}
                        </div>
                        <div className="text-[10px] text-white/35 truncate">{handle}</div>
                      </div>
                      <svg
                        className="h-3 w-3 text-white/20 group-hover:text-white/50 transition group-hover:translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  );
                })}
              </div>

              <p className="mt-5 text-[10px] text-white/25 text-center tracking-wide">
                STATUS ATUALIZADO A CADA 60s // MONITORAMENTO ATIVO
              </p>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
