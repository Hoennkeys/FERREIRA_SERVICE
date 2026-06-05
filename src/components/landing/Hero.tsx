import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section
      id="top"
      className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden"
    >
      {/* Background grid + glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 40%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,149,255,0.25), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[10px] sm:text-xs font-medium tracking-[0.18em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,149,255,0.9)]" />
            FERREIRA NA VOZ
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-6 text-balance text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white uppercase leading-[1.05]">
            A EVOLUÇÃO DO SEU PERSONAGEM. <br /> ENTREGUE NAS MÃOS DE UM{" "}
            <span className="text-primary drop-shadow-[0_0_25px_rgba(0,149,255,0.5)]">
              ESPECIALISTA.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-sm sm:text-base text-white/60 leading-relaxed">
            Todos os serviços de alta performance são oferecidos pela "Ferreira
            na Voz". Subimos o nível, as conquistas e o rendimento da sua conta
            em qualquer servidor de Tibia com segurança, rastreamento ativo e
            referência maxima no mercado.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex items-center justify-center">
            <a
              href="#pacotes"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_40px_rgba(0,149,255,0.45)] transition hover:bg-primary/90 hover:shadow-[0_0_60px_rgba(0,149,255,0.65)]"
            >
              Veja nossos serviços
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
