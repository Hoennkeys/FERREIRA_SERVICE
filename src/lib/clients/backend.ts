import { isSupabaseConfigured, supabase } from "../supabase";
import { isMissingTableError } from "../supabase-errors";

export type PedidosBackendStatus =
  | { status: "ready" }
  | { status: "unconfigured"; message: string }
  | { status: "setup"; message: string }
  | { status: "error"; message: string };

/** Verifica se o backend de pedidos (RPC + RLS Fase 1) está disponível. */
export async function probePedidosBackend(): Promise<PedidosBackendStatus> {
  if (!isSupabaseConfigured()) {
    return {
      status: "unconfigured",
      message:
        "Supabase não está configurado neste deploy (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
    };
  }

  const nilUuid = "00000000-0000-0000-0000-000000000000";

  const { error: reservaProbeError } = await supabase.rpc(
    "pedido_allows_homepage_reserva",
    { p_pedido_id: nilUuid },
  );

  if (!reservaProbeError) {
    return { status: "ready" };
  }

  const msg = reservaProbeError.message ?? "";
  const fnMissing =
    reservaProbeError.code === "PGRST202" ||
    msg.includes("Could not find the function") ||
    msg.includes("pedido_allows_homepage_reserva");

  if (fnMissing || isMissingTableError(reservaProbeError.code, msg)) {
    return {
      status: "setup",
      message:
        "Execute supabase/migrations/security_phase1_fix_reservas_insert.sql (e security_phase1_rls.sql se ainda não rodou) no Supabase.",
    };
  }

  return {
    status: "error",
    message: msg || "Erro ao conectar com o banco de pedidos.",
  };
}

export function usesCloudPedidos(): boolean {
  const mode = import.meta.env.VITE_CLIENTS_BACKEND;
  if (mode === "mock") return false;
  if (mode === "supabase") return true;
  return isSupabaseConfigured();
}
