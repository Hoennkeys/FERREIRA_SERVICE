import { formatDuration } from "./parse";
import type { ClientPayment, HuntSession, ServiceClient } from "./api";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const gp = (n: number) => `${n.toLocaleString("pt-BR")} gp`;
export const fmtHours = (h: number) => {
  const neg = h < 0;
  const s = Math.round(Math.abs(h) * 3600);
  return `${neg ? "-" : ""}${formatDuration(s)}`;
};

export function buildWhatsAppReport(args: {
  client: ServiceClient;
  hunt?: HuntSession | null;
  payments: ClientPayment[];
  hoursToday: number;
}): string {
  const { client, hunt, payments, hoursToday } = args;
  const lines: string[] = [`🎮 *FERREIRA SERVICE — Relatório*`, `Olá, *${client.name}*! 👋`, ""];

  if (hunt) {
    lines.push(
      `⚔️ *Sessão de ${new Date(hunt.session_date).toLocaleDateString("pt-BR")}*`,
      `⏱️ Tempo: *${formatDuration(hunt.duration_seconds)}*`,
      `✨ Exp/h: *${hunt.exp_per_hour.toLocaleString("pt-BR")}*`,
      `💰 Loot: *${gp(hunt.loot_value)}*`,
      `🧪 Supplies: *${gp(hunt.supplies_cost)}*`,
      `📈 Lucro: *${gp(hunt.profit_balance)}*`,
      "",
    );
  }
  lines.push(`📅 Horas realizadas hoje: *${fmtHours(hoursToday)}*`, "");

  if (payments.length) {
    lines.push(`🧾 *Pagamentos recentes*`);
    payments.slice(0, 3).forEach((p) =>
      lines.push(`• ${new Date(p.date).toLocaleDateString("pt-BR")} — ${brl(p.amount_paid)} (+${fmtHours(p.hours_credited)})`),
    );
    lines.push("");
  }
  lines.push(`⏳ *Saldo restante no pacote: ${fmtHours(client.balance_hours)}*`, "", `Qualquer dúvida, é só chamar! 🚀`);
  return lines.join("\n");
}

/** Mensagem de um print/sessão individual da galeria. */
export function buildHuntMessage(args: { client: ServiceClient; hunt: HuntSession; imageUrl?: string | null }): string {
  const { client, hunt, imageUrl } = args;
  const hours = hunt.duration_seconds / 3600;
  const serviceNames: Record<string, string> = {
    hunt: "⚔️ Service de Hunt",
    treino: "🛡️ Service de Treino",
    quebra: "🔨 Quebra de Itens",
    custom: "✨ Serviço Personalizado",
  };
  const typeLabel = serviceNames[hunt.service_type ?? "hunt"] ?? "⚔️ Service Realizado";

  const lines = [
    `🎮 *FERREIRA SERVICE — ${typeLabel}*`,
    `Olá, *${client.name}*! 👋`,
    "",
    `📅 Sessão de *${new Date(hunt.session_date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}*`,
    `⏱️ Duração: *${formatDuration(hunt.duration_seconds)}*`,
  ];

  if (hunt.hourly_rate) {
    const cost = hunt.cost_reais ?? Math.round(hours * hunt.hourly_rate * 100) / 100;
    lines.push(`💰 Taxa: *${brl(hunt.hourly_rate)}/h* · Custo deduzido: *${brl(cost)}*`);
  }

  if (hunt.service_type === "hunt" || (!hunt.service_type && (hunt.loot_value > 0 || hunt.exp_per_hour > 0))) {
    lines.push(
      `✨ Exp/h: *${(hunt.exp_per_hour || (hours > 0 ? Math.round((hunt.xp_gained ?? 0) / hours) : 0)).toLocaleString("pt-BR")}*`,
      `🏆 Exp ganha: *${(hunt.xp_gained ?? 0).toLocaleString("pt-BR")}*`,
      `💰 Loot: *${gp(hunt.loot_value)}*`,
      `🧪 Supplies: *${gp(hunt.supplies_cost)}*`,
      `📈 Lucro: *${gp(hunt.profit_balance)}*${hours > 0 ? ` (${gp(Math.round(hunt.profit_balance / hours))}/h)` : ""}`,
    );
  }

  if (hunt.notes) lines.push(`📝 ${hunt.notes}`);
  if (imageUrl) lines.push("", `📸 Print da sessão: ${imageUrl}`);
  
  if (client.balance_reais !== undefined) {
    lines.push("", `💵 *Saldo restante em créditos: ${brl(client.balance_reais)}*`);
  } else {
    lines.push("", `⏳ *Saldo restante no pacote: ${fmtHours(client.balance_hours)}*`);
  }
  return lines.join("\n");
}

export function whatsappLink(number: string, text: string): string {
  let n = number.replace(/\D/g, "");
  if (n.length <= 11) n = `55${n}`; // assume Brasil
  // api.whatsapp.com preserva emojis (o redirect do wa.me corrompe caracteres de 4 bytes)
  return `https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(text.normalize("NFC"))}`;
}
