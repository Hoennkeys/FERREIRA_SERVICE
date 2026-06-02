import { useState } from "react";
import { Check, Users, X } from "lucide-react";

import {
  clientsStore,
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
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [errorId, setErrorId] = useState<number | null>(null);

  const visible = clients.filter((c) => c.status !== "Arquivado");
  const archived = clients.filter((c) => c.status === "Arquivado");

  async function handleApprove(id: number) {
    setLoadingId(id);
    setErrorId(null);
    const result = await clientsStore.approveClient(id);
    setLoadingId(null);
    if (!result.ok) {
      setErrorId(id);
    }
  }

  function handleArchive(id: number) {
    clientsStore.archiveClient(id);
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
              onApprove={() => handleApprove(client.id)}
              onArchive={() => handleArchive(client.id)}
            />
          ))
        )}

        {archived.length > 0 && (
          <div className="pt-4">
            <p className="mb-3 text-[10px] tracking-[0.18em] text-white/30">
              ARQUIVADOS
            </p>
            <div className="space-y-3 opacity-60">
              {archived.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  loading={false}
                  error={false}
                  onApprove={() => {}}
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
  onApprove,
  onArchive,
  readOnly = false,
}: {
  client: ContractClient;
  loading: boolean;
  error: boolean;
  onApprove: () => void;
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
        </div>
        {!readOnly && client.status === "Pendente" && (
          <div className="flex flex-wrap gap-2">
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
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-[11px] text-red-400">
          Falha ao aprovar — slots indisponíveis ou já agendados.
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
            <li>
              Discord:{" "}
              <span className="font-mono text-white/60">{client.contato.discord}</span>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.18em] text-white/40">CHARACTER</p>
          <ul className="mt-2 space-y-1.5 text-sm text-white/80">
            <li>
              <span className="font-semibold text-white">{client.character.nome}</span>
            </li>
            <li>Lv. {client.character.level} · {client.character.vocacao}</li>
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
