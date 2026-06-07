import type { ClientStatus, ContractClient } from "./types";

/** Dias até apagar contratos Finalizado/Arquivado do dashboard e do banco. */
export const CLOSED_CLIENT_RETENTION_DAYS = 5;

const CLOSED_STATUSES: ClientStatus[] = ["Finalizado", "Arquivado"];

export function isClosedStatus(status: ClientStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

/** Data em que o contrato foi encerrado (finalizado ou arquivado). */
export function getClientClosedAt(client: ContractClient): Date | null {
  if (!isClosedStatus(client.status)) return null;
  const raw = client.updatedAt ?? client.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isExpiredClosedClient(
  client: ContractClient,
  retentionDays: number = CLOSED_CLIENT_RETENTION_DAYS,
): boolean {
  const closedAt = getClientClosedAt(client);
  if (!closedAt) return false;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return closedAt.getTime() < cutoff;
}

export function filterVisibleClients(
  clients: ContractClient[],
): ContractClient[] {
  return clients.filter((c) => !isExpiredClosedClient(c));
}

export function getExpiredClosedClientIds(clients: ContractClient[]): string[] {
  return clients.filter((c) => isExpiredClosedClient(c)).map((c) => c.id);
}

export function retentionCutoffIso(
  retentionDays: number = CLOSED_CLIENT_RETENTION_DAYS,
): string {
  const d = new Date();
  d.setDate(d.getDate() - retentionDays);
  return d.toISOString();
}
