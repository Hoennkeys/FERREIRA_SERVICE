import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Anvil,
  Check,
  Clipboard,
  Clock,
  Coins,
  Edit2,
  Loader2,
  MessageCircle,
  Plus,
  Receipt,
  Settings2,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import {
  addHuntSession, addPayment, createServiceClient, deleteHuntSession, deletePayment, getClientStats,
  listHunts, listPayments, listServiceClients, shareableUrl, signedUrls, uploadProof,
  SERVICE_CONFIG, type ServiceType,
  type ClientPayment, type ClientStats, type HuntSession, type ServiceClient,
} from "@/lib/hunt/api";
import { runHuntOcr } from "@/lib/hunt/ocr";
import { formatDuration, parseDuration, parseTibiaNumber } from "@/lib/hunt/parse";
import { buildHuntMessage, buildWhatsAppReport, fmtHours, whatsappLink } from "@/lib/hunt/report";
import { HuntGallery } from "./HuntGallery";
import { cn } from "@/lib/utils";

const card = "rounded-xl border border-zinc-800 bg-[#0c0c0e] p-4";
const input =
  "w-full rounded-lg border border-zinc-800 bg-[#0d0d10] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50";
const label = "mb-1 block text-[10px] tracking-[0.15em] text-white/40";

type Mode = "hunt" | "payment";

const fmtXp = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}kk` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);

const DEFAULT_RATES_KEY = "ferreira_service_rates_v1";

function getStoredRates(): Record<ServiceType, number> {
  try {
    const saved = localStorage.getItem(DEFAULT_RATES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    hunt: SERVICE_CONFIG.hunt.defaultRate,
    treino: SERVICE_CONFIG.treino.defaultRate,
    quebra: SERVICE_CONFIG.quebra.defaultRate,
    custom: SERVICE_CONFIG.custom.defaultRate,
  };
}

function Hero({
  icon: Icon,
  title,
  value,
  accent,
  negative,
  sub,
}: {
  icon: typeof Clock;
  title: string;
  value: string;
  accent?: boolean;
  negative?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={cn(
        card,
        accent && !negative && "border-emerald-500/30 shadow-[0_0_20px_rgba(0,255,102,0.08)]",
        negative && "border-red-500/40 bg-red-950/10 shadow-[0_0_20px_rgba(239,68,68,0.12)]",
      )}
    >
      <div className="flex items-center justify-between text-[10px] tracking-[0.15em] text-white/40">
        <span className="flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", negative ? "text-red-400" : "text-emerald-400")} /> {title}
        </span>
        {sub && (
          <span className={cn("text-[10px] font-medium", negative ? "text-red-400" : "text-emerald-400/80")}>
            {sub}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tracking-tight",
          negative ? "text-red-400" : accent ? "text-[#00FF66]" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function HuntTab() {
  const [clients, setClients] = useState<ServiceClient[]>([]);
  const [clientId, setClientId] = useState("");
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showNew, setShowNew] = useState(false);

  // Serviços e Taxas
  const [serviceType, setServiceType] = useState<ServiceType>("hunt");
  const [rates, setRates] = useState<Record<ServiceType, number>>(getStoredRates);
  const [showRateModal, setShowRateModal] = useState(false);
  const [tempRates, setTempRates] = useState<Record<ServiceType, number>>(rates);
  const [customHourlyRate, setCustomHourlyRate] = useState<string>(() => String(rates[serviceType]));

  const [stats, setStats] = useState<ClientStats | null>(null);
  const [hunts, setHunts] = useState<HuntSession[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const [mode, setMode] = useState<Mode>("hunt");
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  // form (valores como string p/ edição livre)
  const [duration, setDuration] = useState("");
  const [exp, setExp] = useState("");
  const [xpGain, setXpGain] = useState("");
  const [loot, setLoot] = useState("");
  const [supplies, setSupplies] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [hoursBought, setHoursBought] = useState("");

  const client = clients.find((c) => c.id === clientId) ?? null;
  const filtered = useMemo(
    () => clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [clients, search],
  );

  // Troca de serviço atualiza taxa sugerida no input
  const handleServiceSelect = (st: ServiceType) => {
    setServiceType(st);
    setCustomHourlyRate(String(rates[st]));
  };

  const profit = parseTibiaNumber(loot) - parseTibiaNumber(supplies);
  const durSecs = parseDuration(duration);
  const profitPerHour = durSecs > 0 ? Math.round(profit / (durSecs / 3600)) : 0;
  const currentHourlyRateNum = parseFloat(customHourlyRate.replace(",", ".")) || rates[serviceType] || 0;
  const serviceCost = durSecs > 0 ? (durSecs / 3600) * currentHourlyRateNum : 0;
  const zoneRef = useRef<HTMLDivElement>(null);

  const saveRates = () => {
    setRates(tempRates);
    localStorage.setItem(DEFAULT_RATES_KEY, JSON.stringify(tempRates));
    setCustomHourlyRate(String(tempRates[serviceType]));
    setShowRateModal(false);
    toast.success("Valores dos serviços atualizados!");
  };

  const reloadClients = useCallback(async () => {
    try { setClients(await listServiceClients()); } catch (e) { toast.error((e as Error).message); }
  }, []);

  const reloadClientData = useCallback(async (id: string) => {
    try {
      const [s, h, p] = await Promise.all([getClientStats(id), listHunts(id), listPayments(id)]);
      setStats(s); setHunts(h); setPayments(p);
      setUrls(await signedUrls([...h.flatMap((x) => [x.stopwatch_image_url, x.loot_image_url]), ...p.map((x) => x.proof_image_url)]));
      await reloadClients(); // saldo atualizado pelos triggers
    } catch (e) { toast.error((e as Error).message); }
  }, [reloadClients]);

  useEffect(() => { void reloadClients(); }, [reloadClients]);
  useEffect(() => { if (clientId) void reloadClientData(clientId); else { setStats(null); setHunts([]); setPayments([]); } }, [clientId, reloadClientData]);

  const resetForm = () => {
    setFile(null); setPreview(null); setDuration(""); setExp(""); setXpGain(""); setLoot(""); setSupplies("");
    setNotes(""); setAmount(""); setHoursBought("");
  };

  const handleImage = useCallback(async (blob: Blob) => {
    setFile(blob);
    setPreview(URL.createObjectURL(blob));
    if (mode !== "hunt") return;
    setOcrBusy(true); setOcrProgress(0);
    try {
      const r = await runHuntOcr(blob, setOcrProgress);
      if (r.duration_seconds) setDuration(formatDuration(r.duration_seconds));
      if (r.exp_per_hour) setExp(String(r.exp_per_hour));
      if (r.xp_gain) setXpGain(String(r.xp_gain));
      if (r.loot) setLoot(String(r.loot));
      if (r.supplies) setSupplies(String(r.supplies));
      if (!r.exp_per_hour || !r.supplies) console.debug("OCR texto bruto:", r.rawText);
      toast.success(r.duration_seconds ? "OCR concluído — confira os valores" : "OCR não achou a duração; preencha manualmente");
    } catch {
      toast.error("Falha no OCR. Preencha manualmente.");
    } finally { setOcrBusy(false); }
  }, [mode]);

  // Ctrl+V global
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const blob = item?.getAsFile();
      if (blob) { e.preventDefault(); void handleImage(blob); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleImage]);

  async function createClient() {
    if (!newName.trim()) return toast.error("Informe o nome");
    try {
      const c = await createServiceClient(newName, newPhone);
      await reloadClients(); setClientId(c.id); setShowNew(false); setNewName(""); setNewPhone("");
      toast.success("Cliente cadastrado");
    } catch (e) { toast.error((e as Error).message); }
  }

  async function save() {
    if (!client) return toast.error("Selecione um cliente");
    setSaving(true);
    try {
      const path = file ? await uploadProof(file, `${client.id}/${mode}`) : null;
      if (mode === "payment") {
        const paid = parseFloat(amount.replace(",", "."));
        const hrs = parseFloat(hoursBought.replace(",", "."));
        if (isNaN(paid) || paid <= 0) throw new Error("Informe o valor pago em R$");
        // Se horas não foi especificado, calcula com base na taxa de hunt padrão ou contratada
        const calculatedHours = hrs > 0 ? hrs : paid / (rates.hunt || 15);
        await addPayment({ client_id: client.id, amount_paid: paid, hours_credited: calculatedHours, proof_image_url: path });
      } else {
        const secs = parseDuration(duration);
        if (!secs) throw new Error("Duração inválida (use HH:MM:SS)");
        const l = parseTibiaNumber(loot), s = parseTibiaNumber(supplies);
        const rate = parseFloat(customHourlyRate.replace(",", ".")) || rates[serviceType] || 15;
        const totalCost = Math.round((secs / 3600) * rate * 100) / 100;
        await addHuntSession({
          client_id: client.id,
          duration_seconds: secs,
          service_type: serviceType,
          hourly_rate: rate,
          cost_reais: totalCost,
          exp_per_hour: parseTibiaNumber(exp),
          xp_gained: parseTibiaNumber(xpGain) || Math.round(parseTibiaNumber(exp) * secs / 3600),
          loot_value: l, supplies_cost: s, profit_balance: l - s,
          stopwatch_image_url: path, loot_image_url: null, notes: notes || null,
        });
      }
      toast.success("Salvo com sucesso!"); resetForm(); await reloadClientData(client.id);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }

  function dispatchWhatsApp() {
    if (!client) return;
    if (!client.whatsapp_number) return toast.error("Cliente sem WhatsApp cadastrado");
    const text = buildWhatsAppReport({ client, hunt: hunts[0], payments, hoursToday: stats?.hours_today ?? 0 });
    window.open(whatsappLink(client.whatsapp_number, text), "_blank", "noopener,noreferrer");
  }

  async function sendHunt(h: HuntSession) {
    if (!client) return;
    if (!client.whatsapp_number) return toast.error("Cliente sem WhatsApp cadastrado");
    const imageUrl = h.stopwatch_image_url ? await shareableUrl(h.stopwatch_image_url) : null;
    const text = buildHuntMessage({ client, hunt: h, imageUrl });
    window.open(whatsappLink(client.whatsapp_number, text), "_blank", "noopener,noreferrer");
  }

  // Cálculos financeiros do cliente: Total pago deduzido do custo real de todas as sessões
  const clientPaid = stats?.total_paid ?? 0;
  const clientSpentReais = stats?.total_cost_reais ?? 0;
  // O saldo real é o valor pago total subtraído de todos os serviços realizados (se balance_reais no banco ainda não foi recalculado por trigger)
  const balanceReaisCalculated = client ? (clientPaid - clientSpentReais) : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <Swords className="h-6 w-6 text-[#00FF66]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Controle de Serviços &amp; Créditos</h1>
            <p className="text-xs text-white/40">Gestão de Hunt, Treino, Quebra de Itens e Personalizado com saldo em R$</p>
          </div>
        </div>

        {/* Botão de Configuração de Taxas por Hora */}
        <button
          onClick={() => { setTempRates(rates); setShowRateModal(true); }}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-white/80 transition hover:border-emerald-500/50 hover:text-white"
        >
          <Coins className="h-4 w-4 text-emerald-400" /> Definir Valores dos Serviços
        </button>
      </header>

      {/* Modal para Ajustar Valores de Serviços */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0e0e11] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Tabela de Preços por Hora (R$/h)</h2>
              </div>
              <button onClick={() => setShowRateModal(false)} className="text-white/40 hover:text-white text-xs">✕ Fechar</button>
            </div>
            <p className="text-xs text-white/50">
              Configure o valor padrão por hora para cada serviço. Você também poderá ajustar individualmente durante o registro de cada sessão.
            </p>
            <div className="space-y-3">
              <div>
                <label className={label}>⚔️ SERVICE DE HUNT (R$/h)</label>
                <input
                  type="number"
                  step="0.5"
                  className={input}
                  value={tempRates.hunt}
                  onChange={(e) => setTempRates((prev) => ({ ...prev, hunt: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className={label}>🛡️ SERVICE DE TREINO (R$/h)</label>
                <input
                  type="number"
                  step="0.5"
                  className={input}
                  value={tempRates.treino}
                  onChange={(e) => setTempRates((prev) => ({ ...prev, treino: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className={label}>🔨 QUEBRA DE ITENS / FORJA (R$/h)</label>
                <input
                  type="number"
                  step="0.5"
                  className={input}
                  value={tempRates.quebra}
                  onChange={(e) => setTempRates((prev) => ({ ...prev, quebra: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className={label}>✨ PERSONALIZADO (R$/h)</label>
                <input
                  type="number"
                  step="0.5"
                  className={input}
                  value={tempRates.custom}
                  onChange={(e) => setTempRates((prev) => ({ ...prev, custom: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button className={cn(btn, "border-zinc-800 bg-transparent text-white/60")} onClick={() => setShowRateModal(false)}>Cancelar</button>
              <button className={btn} onClick={saveRates}>Salvar Tabela</button>
            </div>
          </div>
        </div>
      )}

      {/* Seletor de cliente */}
      <section className={cn(card, "space-y-3")}>
        <div className="flex flex-wrap gap-2">
          <input className={cn(input, "max-w-xs")} placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={cn(input, "max-w-xs")} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecione o cliente</option>
            {filtered.map((c) => {
              const isSelected = c.id === clientId;
              const displayReais = isSelected ? balanceReaisCalculated : (c.balance_reais ?? c.balance_hours * 15);
              return (
                <option key={c.id} value={c.id}>
                  {c.name} — R$ {displayReais.toFixed(2)} ({fmtHours(c.balance_hours)})
                </option>
              );
            })}
          </select>
          <button className={btn} onClick={() => setShowNew((v) => !v)}><Plus className="h-4 w-4" /> Novo cliente</button>
        </div>
        {showNew && (
          <div className="flex flex-wrap gap-2">
            <input className={cn(input, "max-w-xs")} placeholder="Nome / personagem" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className={cn(input, "max-w-xs")} placeholder="WhatsApp (DDD + número)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <button className={btn} onClick={createClient}>Cadastrar</button>
          </div>
        )}
      </section>

      {/* Seletor de Tipo de Serviço (logo ao selecionar o cliente) */}
      {client && (
        <section className={cn(card, "space-y-3 border-emerald-500/30 bg-emerald-950/10")}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Escolha o Serviço a Registrar</span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400 font-medium">
                Cliente: {client.name}
              </span>
            </div>
            <div className="text-xs text-white/60">
              Taxa selecionada: <strong className="text-emerald-400 font-bold">R$ {currentHourlyRateNum.toFixed(2)}/h</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["hunt", "treino", "quebra", "custom"] as ServiceType[]).map((st) => {
              const active = serviceType === st;
              const cfg = SERVICE_CONFIG[st];
              return (
                <button
                  key={st}
                  onClick={() => handleServiceSelect(st)}
                  className={cn(
                    "relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                    active
                      ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_15px_rgba(0,255,102,0.1)]"
                      : "border-zinc-800 bg-[#0d0d10] hover:border-zinc-700"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-base">{cfg.icon}</span>
                    <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                      R$ {rates[st].toFixed(2)}/h
                    </span>
                  </div>
                  <span className={cn("text-xs font-bold", active ? "text-white" : "text-white/80")}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-white/40 line-clamp-1">{cfg.description}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {client && (
        <>
          {/* Métricas organizadas por seções */}
          <div className="space-y-4">
            {/* Seção 1: Saldo e Tempo */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Saldo &amp; Tempo de Serviços</span>
                </div>
                <span className="text-[11px] text-white/40">Hoje · Semana · Mês</span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Hero
                  accent={balanceReaisCalculated >= 0}
                  negative={balanceReaisCalculated < 0}
                  icon={Wallet}
                  title={balanceReaisCalculated < 0 ? "SALDO DEVEDOR (A PAGAR)" : "SALDO DISPONÍVEL (R$)"}
                  value={
                    balanceReaisCalculated < 0
                      ? `- R$ ${Math.abs(balanceReaisCalculated).toFixed(2)}`
                      : `R$ ${balanceReaisCalculated.toFixed(2)}`
                  }
                  sub={
                    balanceReaisCalculated < 0
                      ? `Cliente deve ~${fmtHours(Math.abs(balanceReaisCalculated) / (currentHourlyRateNum || 15))}`
                      : `equiv. ~${fmtHours(balanceReaisCalculated / (currentHourlyRateNum || 15))}`
                  }
                />
                <Hero icon={Clock} title="HORAS NO DIA (HOJE)" value={fmtHours(stats?.hours_today ?? 0)} />
                <Hero icon={Clock} title="HORAS NA SEMANA" value={fmtHours(stats?.hours_week ?? 0)} />
                <Hero icon={Clock} title="HORAS NO MÊS" value={fmtHours(stats?.hours_month ?? 0)} />
              </div>
            </div>

            {/* Aviso visual caso esteja negativo */}
            {balanceReaisCalculated < 0 && (
              <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2.5 text-xs text-red-300">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span>
                    <strong>Cliente com saldo negativo:</strong> Foram realizados serviços que excederam o valor pago em caixa. Ao registrar um novo pagamento, o valor abaterá esta dívida e atualizará o saldo positivo.
                  </span>
                </div>
                <button
                  onClick={() => setMode("payment")}
                  className="rounded-lg border border-red-500/40 bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-200 transition hover:bg-red-500/30"
                >
                  + Lançar Pagamento
                </button>
              </div>
            )}

            {/* Seção 2: Desempenho & Experiência (XP) */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Experiência &amp; Eficiência</span>
                </div>
                <span className="text-[11px] text-white/40">Progresso de XP</span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Hero icon={Zap} title="XP NA SEMANA" value={fmtXp(stats?.xp_week ?? 0)} />
                <Hero icon={Zap} title="XP NO MÊS" value={fmtXp(stats?.xp_month ?? 0)} />
                <Hero icon={Zap} title="XP ACUMULADA" value={fmtXp(stats?.total_xp ?? 0)} />
                <Hero icon={Zap} title="EXP/H MÉDIO" value={Math.round(stats?.avg_exp_per_hour ?? 0).toLocaleString("pt-BR")} />
              </div>
            </div>

            {/* Seção 3: Financeiro, Lucro & Atividade */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Lucro &amp; Histórico</span>
                </div>
                <span className="text-[11px] text-white/40">{stats?.total_sessions ?? 0} sessões registradas</span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Hero icon={TrendingUp} title="LUCRO NA SEMANA" value={`${(stats?.profit_week ?? 0).toLocaleString("pt-BR")} gp`} />
                <Hero icon={TrendingUp} title="LUCRO NO MÊS" value={`${(stats?.profit_month ?? 0).toLocaleString("pt-BR")} gp`} />
                <Hero icon={TrendingUp} title="LUCRO TOTAL" value={`${(stats?.total_profit ?? 0).toLocaleString("pt-BR")} gp`} />
                <Hero icon={TrendingUp} title="PROFIT/H MÉDIO" value={`${Math.round((stats?.total_profit ?? 0) / (stats?.total_hours || 1)).toLocaleString("pt-BR")} gp`} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2 text-xs text-white/50">
            <span>Sessões: <strong className="text-white/80">{stats?.total_sessions ?? 0}</strong></span>
            <span>Total jogado: <strong className="text-white/80">{fmtHours(stats?.total_hours ?? 0)}</strong></span>
            <span>Total pago pelo cliente: <strong className="text-emerald-400">R$ {clientPaid.toFixed(2)}</strong></span>
            <span>Total deduzido em serviços: <strong className="text-amber-400">R$ {clientSpentReais.toFixed(2)}</strong></span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Upload + OCR */}
            <section className={cn(card, "space-y-3")}>
              <div className="flex gap-2">
                {(["hunt", "payment"] as Mode[]).map((m) => (
                  <button key={m} onClick={() => { setMode(m); resetForm(); }}
                    className={cn("flex-1 rounded-lg border px-3 py-2 text-sm", mode === m ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 text-white/50")}>
                    {m === "hunt" ? `${SERVICE_CONFIG[serviceType].icon} Registrar ${SERVICE_CONFIG[serviceType].label}` : "🧾 Pagamento / Depósito PIX"}
                  </button>
                ))}
              </div>
              <div
                ref={zoneRef} tabIndex={0}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) void handleImage(f); }}
                className={cn("relative flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition",
                  dragging ? "border-[#00FF66] bg-emerald-500/10" : "border-zinc-700 hover:border-emerald-500/40")}
              >
                {preview ? <img src={preview} alt="Preview" className="max-h-64 rounded-lg" /> : (
                  <>
                    <Clipboard className="h-8 w-8 text-emerald-400" />
                    <p className="text-sm text-white/70">Arraste o print ou use <kbd className="rounded bg-zinc-800 px-1">Ctrl+V</kbd></p>
                    <p className="text-xs text-white/30">{mode === "hunt" ? "Hunt Analyser ou cronômetro do Windows" : "Comprovante PIX"}</p>
                  </>
                )}
                {ocrBusy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/70">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00FF66]" />
                    <div className="h-1.5 w-40 overflow-hidden rounded bg-zinc-800">
                      <div className="h-full bg-[#00FF66] transition-all" style={{ width: `${Math.round(ocrProgress * 100)}%` }} />
                    </div>
                    <span className="text-xs text-white/60">Lendo imagem…</span>
                  </div>
                )}
              </div>
            </section>

            {/* Formulário */}
            <section className={cn(card, "space-y-3")}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  {mode === "hunt" ? `${SERVICE_CONFIG[serviceType].icon} ${SERVICE_CONFIG[serviceType].label}` : "🧾 Registrar Pagamento / Depósito"}
                </h2>
                {mode === "hunt" && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span>Taxa:</span>
                    <input
                      type="number"
                      step="0.5"
                      className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs text-right text-emerald-300 font-bold focus:border-emerald-500"
                      value={customHourlyRate}
                      onChange={(e) => setCustomHourlyRate(e.target.value)}
                    />
                    <span className="text-[10px] text-white/40">R$/h</span>
                  </div>
                )}
              </div>

              {mode === "hunt" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={label}>DURAÇÃO (HH:MM:SS)</span>
                    <input className={input} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="04:14:01" />
                  </div>
                  <div>
                    <span className={label}>TAXA DO SERVIÇO (R$/h)</span>
                    <input
                      type="number"
                      step="0.5"
                      className={input}
                      value={customHourlyRate}
                      onChange={(e) => setCustomHourlyRate(e.target.value)}
                      placeholder="15.00"
                    />
                  </div>

                  {serviceType === "hunt" ? (
                    <>
                      <div><span className={label}>EXP/H</span><input className={input} value={exp} onChange={(e) => setExp(e.target.value)} placeholder="1.2kk" /></div>
                      <div><span className={label}>EXP GAINED (TOTAL)</span><input className={input} value={xpGain} onChange={(e) => setXpGain(e.target.value)} placeholder="5.1kk" /></div>
                      <div><span className={label}>LOOT</span><input className={input} value={loot} onChange={(e) => setLoot(e.target.value)} placeholder="394k" /></div>
                      <div><span className={label}>SUPPLIES</span><input className={input} value={supplies} onChange={(e) => setSupplies(e.target.value)} placeholder="120k" /></div>
                    </>
                  ) : null}

                  <div className="col-span-2">
                    <span className={label}>OBSERVAÇÕES / NOTAS</span>
                    <input
                      className={input}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={serviceType === "quebra" ? "Ex: Quebra de itens de forja, 150 slivers obtidos" : serviceType === "treino" ? "Ex: Treino de club em modified gnarlhounds" : "Notas do serviço"}
                    />
                  </div>

                  <div className="col-span-2 rounded-lg border border-zinc-800 bg-[#0a0a0c] p-2.5 text-xs text-white/50 space-y-1">
                    <div className="flex justify-between items-center text-white/80 font-medium">
                      <span>Valor deduzido do saldo:</span>
                      <strong className="text-emerald-400 text-sm">
                        R$ {serviceCost.toFixed(2)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-white/40">
                      <span>Tempo: {durSecs > 0 ? fmtHours(durSecs / 3600) : "00:00:00"} ({durSecs > 0 ? (durSecs / 3600).toFixed(2) : "0"}h)</span>
                      <span>Taxa aplicada: R$ {currentHourlyRateNum.toFixed(2)}/h</span>
                    </div>
                    {serviceType === "hunt" && (
                      <p className="pt-1 text-[11px] text-white/40 border-t border-zinc-800/80">
                        Profit Tibia: <b className={profit >= 0 ? "text-[#00FF66]" : "text-red-400"}>{profit.toLocaleString("pt-BR")} gp</b>
                        {durSecs > 0 && <> · Loot/h: <b className="text-white/70">{Math.round(parseTibiaNumber(loot) / (durSecs / 3600)).toLocaleString("pt-BR")} gp</b></>}
                        {profitPerHour !== 0 && <> · Profit/h: <b className={profitPerHour >= 0 ? "text-[#00FF66]" : "text-red-400"}>{profitPerHour.toLocaleString("pt-BR")} gp</b></>}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <span className={label}>VALOR PAGO / DEPOSITADO (R$)</span>
                    <input className={input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200,00" />
                  </div>
                  <div className="col-span-2">
                    <span className={label}>HORAS CONTRATADAS ESTIMADAS (OPCIONAL)</span>
                    <input className={input} value={hoursBought} onChange={(e) => setHoursBought(e.target.value)} placeholder="Deixe em branco para calcular automaticamente" />
                    <p className="mt-1 text-[10px] text-white/30">
                      O valor em R$ será creditado diretamente no saldo do cliente e consumido pelas taxas de cada serviço realizado.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button className={btn} onClick={save} disabled={saving || ocrBusy}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Registrar {mode === "hunt" ? "Serviço" : "Depósito"}
                </button>
                <button className={cn(btn, "border-zinc-700 bg-transparent text-white/60")} onClick={resetForm}>Limpar</button>
                <button className={cn(btn, "ml-auto")} onClick={dispatchWhatsApp}><MessageCircle className="h-4 w-4" /> Despachar no WhatsApp</button>
              </div>
            </section>
          </div>

          <HuntGallery
            hunts={hunts} payments={payments} urls={urls} onSend={sendHunt}
            onDelete={async (it) => {
              if (!confirm("Excluir registro? O saldo será ajustado.")) return;
              try { it.kind === "hunt" ? await deleteHuntSession(it.h.id) : await deletePayment(it.p.id); await reloadClientData(clientId); }
              catch (e) { toast.error((e as Error).message); }
            }}
          />
        </>
      )}
    </div>
  );
}
