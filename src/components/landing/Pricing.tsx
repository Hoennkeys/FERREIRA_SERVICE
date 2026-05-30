import { useState } from "react";
import { Check } from "lucide-react";
import { Reveal } from "./Reveal";
import { OnboardingModal } from "./OnboardingModal";

export type Pkg = {
  id: string;
  name: string;
  hours: string;
  price: string;
  features: string[];
  featured?: boolean;
};

const packages: Pkg[] = [
  {
    id: "starter",
    name: "Pacote Starter",
    hours: "1h",
    price: "R$ 18,00",
    features: ["Sessão de Arranque Rápido", "Monitoramento Ativo", "Finalização de Hunt"],
  },
  {
    id: "standard",
    name: "Pacote Standard",
    hours: "3h",
    price: "R$ 50,00",
    features: ["Sessão contínua", "Planejamento e Otimização", "Relatório Detalhado da Hunt"],
  },
  {
    id: "advanced",
    name: "Pacote Advanced",
    hours: "7h",
    price: "R$ 105,00",
    features: ["Melhor custo-benefício", "Ciclo de Hunt Completo", "Prioridade na fila"],
    featured: true,
  },
  {
    id: "promax",
    name: "Pacote Pro Max",
    hours: "10h",
    price: "R$ 145,00",
    features: ["Operação Estendida de Alta Performance", "Suporte e Cobertura Premium", "Operação Dedicada ao Seu Personagem"],
  },
];

export function Pricing() {
  const [selected, setSelected] = useState<Pkg | null>(null);

  return (
    <section id="pacotes" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="text-center mb-12">
            <span className="text-[10px] sm:text-xs font-medium tracking-[0.22em] text-white/40">
              SERVICE PACKAGES
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Escolha sua operação.
            </h2>
            <p className="mt-3 text-sm text-white/55">
              Onboarding direto via WhatsApp. Sem cadastro, sem fricção.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <div
                className={`relative glass rounded-2xl p-6 h-full flex flex-col transition ${
                  p.featured
                    ? "border-primary/40 shadow-[0_0_40px_rgba(0,149,255,0.18)]"
                    : "hover:border-white/20"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-primary-foreground shadow-[0_0_20px_rgba(0,149,255,0.6)]">
                    MAIS VENDIDO
                  </span>
                )}
                
                {/* HORAS GIGANTES EM DESTAQUE */}
                <div className="text-5xl sm:text-6xl font-bold tracking-tight text-primary">
                  {p.hours}
                </div>
                
                {/* NOME DO PACOTE DISCRETO */}
                <div className="mt-1 text-xs tracking-wider text-white/40 font-medium">
                  {p.name}
                </div>

                <div className="mt-4 text-3xl font-semibold text-white">
                  {p.price.split(",")[0]}
                  <span className="text-base text-white/40">,{p.price.split(",")[1]}</span>
                </div>
                <ul className="mt-5 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/65">
                      <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`mt-6 w-full rounded-full py-3 text-sm font-semibold transition ${
                    p.featured
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_25px_rgba(0,149,255,0.4)]"
                      : "border border-white/15 bg-white/[0.02] text-white hover:border-primary/40 hover:bg-white/[0.05]"
                  }`}
                >
                  Contratar
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <OnboardingModal pkg={selected} onClose={() => setSelected(null)} />
    </section>
  );
}