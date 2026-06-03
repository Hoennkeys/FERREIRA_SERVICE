import { isSupabaseConfigured } from "../supabase";
import { createMockClientsStore } from "./mock-store";
import { createSupabaseClientsStore } from "./supabase-store";
import type { ClientsStore } from "./store";

/**
 * Produção (Supabase configurado): sempre nuvem — pedidos aparecem no painel /dispatch.
 * Dev sem .env: mock/localStorage apenas neste navegador.
 */
export function createAutoClientsStore(): ClientsStore {
  if (isSupabaseConfigured()) {
    return createSupabaseClientsStore();
  }

  console.warn(
    "[clients] Supabase não configurado — pedidos ficam só no localStorage deste navegador.",
  );
  return createMockClientsStore();
}
