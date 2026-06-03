import { isSupabaseConfigured, supabase } from "../supabase";
import { isMissingTableError } from "../supabase-errors";

export type PedidosBackendStatus =
  | { status: "ready" }
  | { status: "unconfigured"; message: string }
  | { status: "setup"; message: string }
  | { status: "error"; message: string };

const TABLE = "pedidos_cliente";

/** Verifica se pedidos da homepage vão persistir no Supabase (visíveis no painel). */
export async function probePedidosBackend(): Promise<PedidosBackendStatus> {
  if (!isSupabaseConfigured()) {
    return {
      status: "unconfigured",
      message:
        "Supabase não está configurado neste deploy (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
    };
  }

  const { error } = await supabase.from(TABLE).select("id").limit(1);

  if (!error) {
    return { status: "ready" };
  }

  if (isMissingTableError(error.code, error.message)) {
    return {
      status: "setup",
      message:
        'Tabela "pedidos_cliente" ausente. Execute supabase/setup.sql no dashboard do Supabase.',
    };
  }

  return {
    status: "error",
    message: error.message || "Erro ao conectar com o banco de pedidos.",
  };
}

export function usesCloudPedidos(): boolean {
  const mode = import.meta.env.VITE_CLIENTS_BACKEND;
  if (mode === "mock") return false;
  if (mode === "supabase") return true;
  return isSupabaseConfigured();
}
