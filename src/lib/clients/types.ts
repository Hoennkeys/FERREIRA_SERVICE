export type ClientStatus = "Pendente" | "Ativo" | "Finalizado" | "Arquivado";

export interface ContractClient {
  id: string;
  nome: string;
  contato: {
    whatsapp: string;
    discord?: string;
    grupoWhatsApp?: string;
  };
  character: {
    nome: string;
    level: number;
    vocacao?: string;
    servidor: string;
  };
  pacote: {
    id: string;
    nome: string;
    horas: string;
    preco: string;
  };
  agenda: {
    dias: string[];
    horarios: string[];
  };
  slotIds: string[];
  semanaInicio: string;
  status: ClientStatus;
  origem: string;
  createdAt?: string;
}

export interface ClientsState {
  clients: ContractClient[];
}

export type CreateOrderInput = {
  nome: string;
  whatsapp: string;
  discord?: string;
  charNome: string;
  charLevel: number;
  charServidor: string;
  pacoteId: string;
  pacoteNome: string;
  pacoteHoras: string;
  pacotePreco: string;
  agendaDias: string[];
  agendaHorarios: string[];
  slotIds: string[];
  semanaInicio: string;
};

export type ApproveResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "already_active" | "booking_failed" };

export type FinalizeResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "invalid_status" };

/** DB row shape */
export type PedidoRow = {
  id: string;
  nome: string;
  whatsapp: string;
  discord: string | null;
  char_nome: string;
  char_level: number;
  char_servidor: string;
  pacote_id: string;
  pacote_nome: string;
  pacote_horas: string;
  pacote_preco: string;
  agenda_dias: string[];
  agenda_horarios: string[];
  slot_ids: string[];
  semana_inicio: string;
  status: ClientStatus;
  origem: string;
  created_at: string;
};

export function rowToClient(row: PedidoRow): ContractClient {
  return {
    id: row.id,
    nome: row.nome,
    contato: {
      whatsapp: row.whatsapp,
      discord: row.discord ?? undefined,
    },
    character: {
      nome: row.char_nome,
      level: row.char_level,
      servidor: row.char_servidor,
    },
    pacote: {
      id: row.pacote_id,
      nome: row.pacote_nome,
      horas: row.pacote_horas,
      preco: row.pacote_preco,
    },
    agenda: {
      dias: row.agenda_dias,
      horarios: row.agenda_horarios,
    },
    slotIds: row.slot_ids ?? [],
    semanaInicio: row.semana_inicio,
    status: row.status,
    origem: row.origem,
    createdAt: row.created_at,
  };
}
