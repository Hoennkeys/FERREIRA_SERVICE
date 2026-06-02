import { useEffect, useState } from "react";
import { Check, CheckCircle2, MessageCircle, Users, X } from "lucide-react";

import { formatWeekRange } from "@/lib/agenda";
import {
  clientsStore,
  filterVisibleClients,
  useClients,
  type ClientStatus,
  type ContractClient,
} from "@/lib/clients";
import { cn } from "@/lib/utils";

function whatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function statusBadgeClass(status: ClientStatus): string {
  switch (status) {
    case "Ativo":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "Finalizado":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-400";
    case "Arquivado":
      return "border-zinc-600 bg-zinc-800/50 text-white/40";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }
}

function formatAgendaTags(client: ContractClient): string[] {
  return client.agenda.dias.map(
    (dia) => `${dia} (${client.agenda.horarios.join(", ")})`,
  );
}

export function ClientsTab() {
  const { clients } = useClients();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    void clientsStore.purgeExpiredClients();
  }, []);

  const retained = filterVisibleClients(clients);
  const visible = retained.filter((c) => c.status !== "Arquivado");
  const archived = retained.filter((c) => c.status === "Arquivado");

  async function handleApprove(id: string) {
    setLoadingId(id);
    setErrorId(null);
    setSuccessId(null);
    const result = await clientsStore.approveClient(id);
    setLoadingId(null);
    if (!result.ok) {
      setErrorId(id);
    }
  }

  async function handleFinalize(id: string) {
    setLoadingId(id);
    setErrorId(null);
    setSuccessId(null);
    const result = await clientsStore.finalizeClient(id);
    setLoadingId(null);
    if (!result.ok) {
      setErrorId(id);
    } else {
      setSuccessId(id);
    }
  }

  function handleArchive(id: string) {
    void clientsStore.archiveClient(id);
  }

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
          <Users className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-emerald-400">
            ÁREA DE CONTRATAÇÃO
          </p>
          <h1 className="mt-0.5 text-xl font-semibold text-white sm:text-2xl">
            Clientes & Contratos Ativos
          </h1>
          <p className="mt-1 text-[10px] text-white/35">
            Finalizados e arquivados são apagados automaticamente após 5 dias.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] px-6 py-12 text-center">
            <p className="font-mono text-sm text-white/30">
              // nenhum contrato pendente ou ativo
            </p>
          </div>
        ) : (
          visible.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              loading={loadingId === client.id}
              error={errorId === client.id}
              success={successId === client.id}
              onApprove={() => handleApprove(client.id)}
              onFinalize={() => handleFinalize(client.id)}
              onArchive={() => handleArchive(client.id)}
            />
          ))
        )}

        {archived.length > 0 && (
          <div className="pt-4">
            <p className="mb-3 text-[10px] tracking-[0.18em] text-white/30">
              ARQUIVADOS · removidos automaticamente após 5 dias
            </p>
            <div className="space-y-3 opacity-60">
              {archived.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  loading={false}
                  error={false}
                  success={false}
                  onApprove={() => {}}
                  onFinalize={() => {}}
                  onArchive={() => {}}
                  readOnly
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ClientCard({
  client,
  loading,
  error,
  success,
  onApprove,
  onFinalize,
  onArchive,
  readOnly = false,
}: {
  client: ContractClient;
  loading: boolean;
  error: boolean;
  success: boolean;
  onApprove: () => void;
  onFinalize: () => void;
  onArchive: () => void;
  readOnly?: boolean;
}) {
  const tags = formatAgendaTags(client);

  return (
    <article className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{client.nome}</h2>
          <span
            className={cn(
              "mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em]",
              statusBadgeClass(client.status),
            )}
          >
            {client.status.toUpperCase()}
          </span>
          <p className="mt-2 text-[11px] text-white/45">
            {client.pacote.nome} · {client.pacote.horas} · {client.pacote.preco}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-white/30">
            Semana: {formatWeekRange(client.semanaInicio)}
          </p>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <a
              href={whatsAppHref(client.contato.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-[10px] font-semibold tracking-[0.12em] text-cyan-300 transition hover:bg-cyan-500/20"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              CONVERSAR
            </a>

            {client.status === "Pendente" && (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onApprove}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[10px] font-semibold tracking-[0.12em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {loading ? "APROVANDO…" : "APROVAR CONTRATO"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onArchive}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-transparent px-4 py-2 text-[10px] font-semibold tracking-[0.12em] text-red-400/80 transition hover:border-red-500/50 hover:bg-red-500/5 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  RECUSAR/ARQUIVAR
                </button>
              </>
            )}

            {client.status === "Ativo" && (
              <button
                type="button"
                disabled={loading}
                onClick={onFinalize}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-[10px] font-semibold tracking-[0.12em] text-primary transition hover:bg-primary/20 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {loading ? "FINALIZANDO…" : "FINALIZAR SERVIÇO"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-[11px] text-red-400">
          Operação falhou — verifique slots ou tente novamente.
        </p>
      )}

      {success && (
        <p className="mt-3 text-[11px] text-cyan-400">
          Serviço finalizado. Horários liberados na agenda.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <p className="text-[10px] tracking-[0.18em] text-white/40">DADOS PESSOAIS</p>
          <ul className="mt-2 space-y-1.5 text-sm text-white/80">
            <li>
              WhatsApp:{" "}
              <a
                href={whatsAppHref(client.contato.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                {client.contato.whatsapp}
              </a>
            </li>
            {client.contato.discord && (
              <li>
                Discord:{" "}
                <span className="font-mono text-white/60">{client.contato.discord}</span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.18em] text-white/40">CHARACTER</p>
          <ul className="mt-2 space-y-1.5 text-sm text-white/80">
            <li>
              <span className="font-semibold text-white">{client.character.nome}</span>
            </li>
            <li>Lv. {client.character.level}</li>
            <li className="text-white/50">{client.character.servidor}</li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.18em] text-white/40">
            HORÁRIOS CONTRATADOS
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-red-500/25 bg-red-500/10 px-2 py-0.5 font-mono text-[10px] text-red-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
