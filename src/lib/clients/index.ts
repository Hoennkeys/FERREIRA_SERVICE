import { useSyncExternalStore } from "react";

import { createMockClientsStore } from "./mock-store";
import { createAutoClientsStore } from "./auto-store";
import { createSupabaseClientsStore } from "./supabase-store";
import type { ClientsStore } from "./store";
import type { ClientsState } from "./types";

function createStore(): ClientsStore {
  const backend = import.meta.env.VITE_CLIENTS_BACKEND;
  if (backend === "mock") return createMockClientsStore();
  if (backend === "supabase") return createSupabaseClientsStore();
  return createAutoClientsStore();
}

export const clientsStore = createStore();

const EMPTY_STATE: ClientsState = { clients: [] };

export function useClients(): ClientsState {
  return useSyncExternalStore(
    (onChange) => clientsStore.subscribe(onChange),
    () => clientsStore.getState(),
    () => EMPTY_STATE,
  );
}

export { clientsStore as store };
export type { ClientsStore } from "./store";
export type {
  ApproveResult,
  FinalizeResult,
  RemoveClosedResult,
  CreateOrderInput,
  CreateOrderResult,
} from "./types";
export * from "./types";
export {
  CLOSED_CLIENT_RETENTION_DAYS,
  filterVisibleClients,
  isClosedStatus,
  isExpiredClosedClient,
} from "./retention";
export { probePedidosBackend, usesCloudPedidos, type PedidosBackendStatus } from "./backend";
