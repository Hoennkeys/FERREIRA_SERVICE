import { Reveal } from "./Reveal";

const metrics = [
  {
    value: "REFERÊNCIA NO MERCADO",
    label:
      "Garantia de integridade e autenticação protegida, mais de 50 referências em todos os grupos de trades.",
  },
  {
    value: "MINIMO DE PREJUIZO",
    label: "Histórico impecável de expedições com taxa minima de mortes.",
  },
  {
    value: "ECOSISTEMA ATIVO 24/7",
    label:
      "Hub ativo para monitoramento, evolução contínua, atendimento via whatsapp 24/7 e toda a segurança para o seu personagem.",
  },
];

export function MetricsStrip() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {metrics.map((m, i) => (
            <Reveal key={m.value} delay={i * 80}>
              <div className="glass rounded-xl p-5 sm:p-6 h-full transition hover:border-primary/30 hover:shadow-[0_0_30px_rgba(0,149,255,0.12)]">
                <div className="text-base sm:text-lg font-semibold tracking-wide text-primary drop-shadow-[0_0_10px_rgba(0,149,255,0.4)]">
                  {m.value}
                </div>
                <p className="mt-2 text-xs sm:text-sm text-white/55 leading-relaxed">
                  {m.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
