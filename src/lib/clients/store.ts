import type {
  ApproveResult,
  ClientsState,
  CreateOrderInput,
  FinalizeResult,
} from "./types";

export type ClientsListener = (state: ClientsState) => void;

export interface ClientsStore {
  getState(): ClientsState;
  subscribe(listener: ClientsListener): () => void;
  createOrder(input: CreateOrderInput): Promise<{ ok: true; id: string } | { ok: false }>;
  deleteOrder(id: string): Promise<void>;
  approveClient(id: string): Promise<ApproveResult>;
  archiveClient(id: string): Promise<void>;
  finalizeClient(id: string): Promise<FinalizeResult>;
}
