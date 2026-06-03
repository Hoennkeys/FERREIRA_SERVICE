import type {
  ApproveResult,
  ClientsState,
  CreateOrderInput,
  CreateOrderResult,
  FinalizeResult,
  RemoveClosedResult,
} from "./types";

export type ClientsListener = (state: ClientsState) => void;

export interface ClientsStore {
  getState(): ClientsState;
  subscribe(listener: ClientsListener): () => void;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  deleteOrder(id: string): Promise<void>;
  approveClient(id: string): Promise<ApproveResult>;
  archiveClient(id: string): Promise<void>;
  finalizeClient(id: string): Promise<FinalizeResult>;
  removeClosedClient(id: string): Promise<RemoveClosedResult>;
  removeAllClosedClients(): Promise<number>;
  repairAgendaSync(): Promise<number>;
  purgeExpiredClients(): Promise<number>;
}
