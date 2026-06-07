import { createFileRoute, Link } from "@tanstack/react-router";

import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      {
        title: "Ferreira na Voz // Política de Privacidade",
      },
      {
        name: "description",
        content:
          "Como tratamos dados pessoais no formulário de contratação e no painel operacional.",
      },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-[10px] font-medium tracking-[0.22em] text-white/40">
          TRANSPARÊNCIA OPERACIONAL
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Política de Privacidade
        </h1>
        <p className="mt-4 text-sm text-amber-400/90 border border-amber-400/20 bg-amber-500/5 rounded-lg px-4 py-3">
          Rascunho operacional com base no funcionamento atual do site —
          recomenda-se revisão jurídica antes de uso formal.
        </p>
        <p className="mt-6 text-sm text-white/50 leading-relaxed">
          Última atualização: junho de 2026.
        </p>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">1. Quem somos</h2>
          <p>
            O site{" "}
            <strong className="text-white/90">
              Ferreira na Voz // Services
            </strong>{" "}
            é operado por{" "}
            <strong className="text-white/90">Lucas F F da Silva</strong>{" "}
            (&quot;Ferreira na Voz&quot;), responsável pelo tratamento dos dados
            descritos nesta política.
          </p>
          <p>
            Contato para assuntos de privacidade: WhatsApp público disponível na
            landing do site.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">
            2. Dados que coletamos
          </h2>
          <p>
            Ao solicitar um serviço pelo formulário de contratação, podemos
            tratar:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Nome civil ou{" "}
              <strong className="text-white/85">nickname do personagem</strong>{" "}
              (Tibia) — usado para identificar a conta durante o serviço
            </li>
            <li>Número de WhatsApp</li>
            <li>Usuário do Discord (opcional)</li>
            <li>
              Informações do personagem (servidor/world, level, pacote
              escolhido)
            </li>
            <li>Slots de agenda selecionados (dias e horários)</li>
            <li>Status do pedido (Pendente, Ativo, Finalizado, Arquivado)</li>
          </ul>
          <p>
            Distinguimos{" "}
            <strong className="text-white/85">dados de contato</strong>{" "}
            (WhatsApp, Discord) de{" "}
            <strong className="text-white/85">identificadores de jogo</strong>{" "}
            (nick do char, servidor, level). Os nicks de personagem costumam ser
            visíveis publicamente no jogo ou em transmissões ao vivo (Twitch)
            vinculadas ao canal Ferreira na Voz — você pode informá-los
            voluntariamente no formulário para viabilizar a execução do serviço.
          </p>
          <p>
            No painel administrativo (acesso restrito), utilizamos apenas sessão
            de autenticação do operador (e-mail e credenciais gerenciadas pelo
            Supabase Auth).
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">3. Finalidade</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Processar sua solicitação de contratação de serviços</li>
            <li>Comunicação operacional via WhatsApp</li>
            <li>Reserva de horários na agenda</li>
            <li>Gestão da fila de atendimento no painel interno</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">
            4. Base legal (LGPD)
          </h2>
          <p>
            O tratamento se apoia principalmente na{" "}
            <strong className="text-white/90">
              execução de contrato ou de procedimentos preliminares
            </strong>{" "}
            solicitados por você (art. 7º, V, Lei 13.709/2018), incluindo
            WhatsApp, agenda e dados necessários para prestar o serviço
            contratado.
          </p>
          <p>
            Para{" "}
            <strong className="text-white/90">
              nicks de personagem, servidor e level
            </strong>{" "}
            — inclusive quando já expostos publicamente no jogo ou em streams de
            Twitch associadas ao titular — o tratamento pode basear-se no{" "}
            <strong className="text-white/90">legítimo interesse</strong> (art.
            7º, IX) para:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Organizar a fila de atendimento e o painel operacional</li>
            <li>Reservar e executar slots de agenda no personagem indicado</li>
            <li>Evitar conflitos entre pedidos (mesmo nick / mesma conta)</li>
            <li>
              Comunicação operacional alinhada ao serviço de boost solicitado
            </li>
          </ul>
          <p>
            Não utilizamos nicks ou dados de jogo para marketing, revenda de
            listas ou fins distintos dos descritos nesta política. O embed da
            Twitch na landing{" "}
            <strong className="text-white/85">não recebe</strong> os dados do
            formulário de contratação.
          </p>
          <p>
            Você pode solicitar esclarecimentos ou opor-se ao tratamento baseado
            em legítimo interesse pelos canais de contato indicados na seção 8.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">5. Retenção</h2>
          <p>
            Pedidos com status{" "}
            <strong className="text-white/90">Finalizado</strong> ou{" "}
            <strong className="text-white/90">Arquivado</strong> são removidos
            automaticamente após{" "}
            <strong className="text-white/90">5 dias</strong>, tanto na
            interface quanto no banco de dados.
          </p>
          <p>
            Pedidos pendentes ou ativos permanecem enquanto necessários para a
            prestação do serviço.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">
            6. Compartilhamento
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white/90">Supabase</strong> — hospedagem
              do banco de dados e autenticação do painel (operador de
              infraestrutura / processador)
            </li>
            <li>
              <strong className="text-white/90">Vercel</strong> — hospedagem do
              site
            </li>
            <li>
              <strong className="text-white/90">Cloudflare Turnstile</strong>{" "}
              (quando configurado) — verificação anti-bot no formulário
            </li>
          </ul>
          <p>
            O embed da Twitch na página não recebe os dados do formulário de
            contratação.
          </p>
          <p>
            Não vendemos nem compartilhamos seus dados com terceiros para
            marketing.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">
            7. Cookies e armazenamento
          </h2>
          <p>
            A landing pública não utiliza cookies de rastreamento de marketing.
            O painel administrativo utiliza sessão de autenticação (Supabase
            Auth) para manter o login do operador.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">8. Seus direitos</h2>
          <p>Você pode, nos termos da LGPD:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Confirmar se tratamos seus dados</li>
            <li>Solicitar correção ou exclusão</li>
            <li>Revogar consentimento quando o tratamento depender dele</li>
          </ul>
          <p>
            Para exercer esses direitos, entre em contato pelo WhatsApp
            informado no site, identificando o número ou pedido relacionado.
          </p>
        </section>

        <section className="mt-10 space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">9. Segurança</h2>
          <p>
            Aplicamos controles técnicos como isolamento de dados por perfil de
            acesso (RLS no banco), rate limit no formulário público,
            autenticação restrita no painel e comunicação criptografada (HTTPS).
          </p>
        </section>

        <p className="mt-12 text-center">
          <Link
            to="/"
            className="text-sm text-white/45 transition hover:text-white/70"
          >
            ← Voltar para a landing
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
