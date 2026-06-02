import type { ClientsStore, ClientsListener } from "./store";
import { createMockClientsStore } from "./mock-store";
import { createSupabaseClientsStore } from "./supabase-store";
import type {
  ApproveResult,
  CreateOrderInput,
  CreateOrderResult,
  FinalizeResult,
} from "./types";

/**
 * Usa Supabase; se pedidos_cliente não existir, cai para mock (localStorage).
 */
export function createAutoClientsStore(): ClientsStore {
  const supabase = createSupabaseClientsStore();
  const mock = createMockClientsStore();
  let active: ClientsStore = supabase;

  function switchToMock(reason: string) {
    if (active === mock) return;
    console.warn(`[clients] ${reason} — usando store local (rode npm run db:setup)`);
    active = mock;
  }

  return {
    getState: () => active.getState(),
    subscribe: (listener: ClientsListener) => {
      const offSupabase = supabase.subscribe(listener);
      const offMock = mock.subscribe(listener);
      listener(active.getState());
      return () => {
        offSupabase();
        offMock();
      };
    },
    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
      if (active === mock) return mock.createOrder(input);
      const result = await supabase.createOrder(input);
      if (!result.ok && result.reason === "setup") {
        switchToMock("pedidos_cliente ausente");
        return mock.createOrder(input);
      }
      return result;
    },
    async deleteOrder(id: string) {
      return active.deleteOrder(id);
    },
    async approveClient(id: string): Promise<ApproveResult> {
      if (active === mock) return mock.approveClient(id);
      return supabase.approveClient(id);
    },
    async archiveClient(id: string) {
      return active.archiveClient(id);
    },
    async finalizeClient(id: string): Promise<FinalizeResult> {
      if (active === mock) return mock.finalizeClient(id);
      return supabase.finalizeClient(id);
    },
    async purgeExpiredClients(): Promise<number> {
      return active.purgeExpiredClients();
    },
  };
}
