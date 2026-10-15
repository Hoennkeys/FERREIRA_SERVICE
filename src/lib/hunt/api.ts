import { supabase } from "@/lib/supabase";

export type ServiceType = "hunt" | "treino" | "quebra" | "custom";

export const SERVICE_CONFIG: Record<
  ServiceType,
  { label: string; icon: string; defaultRate: number; description: string }
> = {
  hunt: { label: "Service de Hunt", icon: "⚔️", defaultRate: 15.0, description: "Hunt completa com OCR, exp e lucro" },
  treino: { label: "Service de Treino", icon: "🛡️", defaultRate: 10.0, description: "Treino de skills por tempo" },
  quebra: { label: "Quebra de Itens", icon: "🔨", defaultRate: 8.0, description: "Forja / desmontagem de itens por tempo" },
  custom: { label: "Personalizado", icon: "✨", defaultRate: 15.0, description: "Serviço com taxa e regras customizadas" },
};

export type ServiceClient = {
  id: string;
  name: string;
  whatsapp_number: string;
  balance_hours: number;
  balance_reais?: number;
  created_at: string;
};

export type ClientPayment = {
  id: string;
  client_id: string;
  amount_paid: number;
  hours_credited: number;
  proof_image_url: string | null;
  date: string;
};

export type HuntSession = {
  id: string;
  client_id: string;
  session_date: string;
  duration_seconds: number;
  service_type?: ServiceType;
  hourly_rate?: number;
  cost_reais?: number;
  exp_per_hour: number;
  xp_gained: number;
  loot_value: number;
  supplies_cost: number;
  profit_balance: number;
  stopwatch_image_url: string | null;
  loot_image_url: string | null;
  notes: string | null;
};

export type ClientStats = {
  hours_today: number;
  hours_week: number;
  hours_month: number;
  total_sessions: number;
  total_profit: number;
  avg_exp_per_hour: number;
  total_paid: number;
  total_hours: number;
  total_xp: number;
  xp_week: number;
  xp_month: number;
  profit_week: number;
  profit_month: number;
  total_cost_reais?: number;
};

const BUCKET = "hunt-proofs";

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function listServiceClients(): Promise<ServiceClient[]> {
  return must(await supabase.from("service_clients").select("*").order("name")) as ServiceClient[];
}

export async function createServiceClient(name: string, whatsapp: string): Promise<ServiceClient> {
  return must(
    await supabase
      .from("service_clients")
      .insert({ name: name.trim(), whatsapp_number: whatsapp.replace(/\D/g, "") })
      .select()
      .single(),
  ) as ServiceClient;
}

/** Retorna o path salvo no bucket privado (use signedUrl para exibir). */
export async function uploadProof(file: Blob, folder: string): Promise<string> {
  const ext = file.type.split("/")[1] || "png";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedUrls(paths: (string | null)[]): Promise<Record<string, string>> {
  const valid = paths.filter((p): p is string => !!p);
  if (!valid.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(valid, 3600);
  const out: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}

/** Link válido por 7 dias, para enviar o print ao cliente pelo WhatsApp. */
export async function shareableUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export async function addPayment(p: Omit<ClientPayment, "id" | "date">): Promise<void> {
  must(await supabase.from("client_payments").insert(p));
}

export async function addHuntSession(h: Omit<HuntSession, "id" | "session_date"> & { session_date?: string }): Promise<void> {
  const res = await supabase.from("hunt_sessions").insert(h);
  if (res.error) {
    // Se a coluna nova não existir ainda no Supabase (migration não executada), faz fallback limpo
    const { service_type, hourly_rate, cost_reais, ...legacy } = h;
    const fallbackRes = await supabase.from("hunt_sessions").insert(legacy);
    if (fallbackRes.error) {
      throw new Error(fallbackRes.error.message || res.error.message);
    }
  }
}

export async function deleteHuntSession(id: string): Promise<void> {
  must(await supabase.from("hunt_sessions").delete().eq("id", id));
}

export async function deletePayment(id: string): Promise<void> {
  must(await supabase.from("client_payments").delete().eq("id", id));
}

export async function listHunts(clientId: string): Promise<HuntSession[]> {
  return must(
    await supabase.from("hunt_sessions").select("*").eq("client_id", clientId).order("session_date", { ascending: false }),
  ) as HuntSession[];
}

export async function listPayments(clientId: string): Promise<ClientPayment[]> {
  return must(
    await supabase.from("client_payments").select("*").eq("client_id", clientId).order("date", { ascending: false }),
  ) as ClientPayment[];
}

export async function getClientStats(clientId: string): Promise<ClientStats> {
  const rows = must(await supabase.rpc("client_hunt_stats", { p_client: clientId })) as any[];
  const r = rows?.[0];

  // Buscar sessões e pagamentos de forma segura (sem depender de colunas novas para evitar erro)
  let huntsList: any[] = [];
  try {
    const { data, error } = await supabase.from("hunt_sessions").select("*").eq("client_id", clientId);
    if (!error && data) huntsList = data;
  } catch {}

  let paymentsList: any[] = [];
  try {
    const { data, error } = await supabase.from("client_payments").select("amount_paid").eq("client_id", clientId);
    if (!error && data) paymentsList = data;
  } catch {}

  const totalPaidCalc = paymentsList.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
  const totalCostCalc = huntsList.reduce((acc, h) => {
    if (h.cost_reais !== null && h.cost_reais !== undefined && Number(h.cost_reais) > 0) {
      return acc + Number(h.cost_reais);
    }
    const rate = Number(h.hourly_rate) || 15;
    const durSecs = Number(h.duration_seconds) || 0;
    return acc + Math.round((durSecs / 3600) * rate * 100) / 100;
  }, 0);

  return {
    hours_today: Number(r?.hours_today ?? 0),
    hours_week: Number(r?.hours_week ?? 0),
    hours_month: Number(r?.hours_month ?? 0),
    total_sessions: Number(r?.total_sessions ?? 0),
    total_profit: Number(r?.total_profit ?? 0),
    avg_exp_per_hour: Number(r?.avg_exp_per_hour ?? 0),
    total_paid: totalPaidCalc > 0 ? totalPaidCalc : Number(r?.total_paid ?? 0),
    total_hours: Number(r?.total_hours ?? 0),
    total_xp: Number(r?.total_xp ?? 0),
    xp_week: Number(r?.xp_week ?? 0),
    xp_month: Number(r?.xp_month ?? 0),
    profit_week: Number(r?.profit_week ?? 0),
    profit_month: Number(r?.profit_month ?? 0),
    total_cost_reais: totalCostCalc,
  };
}
