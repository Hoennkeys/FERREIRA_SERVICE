import { useEffect, useState, type FormEvent } from "react";
import { X, MessageCircle, Calendar, ChevronLeft, Loader2, Copy } from "lucide-react";
import { createStaticPix, hasError } from "pix-utils";
import type { Pkg } from "./Pricing";
import { AgendaGrid } from "@/components/agenda/AgendaGrid";
import {
  agendaFromBlock,
  bookSlotBlock,
  DIAS_FULL_LABELS,
  getWeekStart,
  type AgendaSlot,
} from "@/lib/agenda";
import {
  clientsStore,
  probePedidosBackend,
  type PedidosBackendStatus,
} from "@/lib/clients";

const WHATSAPP = "5581982180780";

const PIX_KEY = "+5581982180780";
const PIX_MERCHANT_NAME = "Lucas F F da Silva";
const PIX_MERCHANT_CITY = "Recife";

type Step = 0 | 1 | 2;

function isValidWhatsApp(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}

function parsePkgPriceToNumber(price: string): number {
  const normalized = price.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(normalized) || 0;
}

/** BR Code: descrição no campo da chave (máx. 25 caracteres). */
function pixInfoAdicional(pkg: Pkg): string {
  const label = `Ferreira ${pkg.name.replace(/^Pacote\s+/i, "")}`;
  return label.slice(0, 25);
}

function generatePixBrCode(pkg: Pkg): string | null {
  const pix = createStaticPix({
    merchantName: PIX_MERCHANT_NAME,
    merchantCity: PIX_MERCHANT_CITY,
    pixKey: PIX_KEY,
    transactionAmount: parsePkgPriceToNumber(pkg.price),
    infoAdicional: pixInfoAdicional(pkg),
  });
  if (hasError(pix)) return null;
  return pix.toBRCode();
}

function buildWhatsAppMessage(params: {
  pkg: Pkg;
  char: string;
  world: string;
  level: string;
  whatsapp: string;
  discord: string;
  diaFull: string;
  fmtInicio: string;
  fmtFim: string;
  blockHours: number;
  includePixStatus: boolean;
}): string {
  const {
    pkg: p,
    char,
    world,
    level,
    whatsapp,
    discord,
    diaFull,
    fmtInicio,
    fmtFim,
    blockHours,
    includePixStatus,
  } = params;

  const pixHeader = includePixStatus
    ? `💰 *[STATUS: PIX COPIA E COLA GERADO NO VALOR DE ${p.price}]*
*(Por favor, anexe o comprovante nesta conversa)*

`
    : "";

  return `${pixHeader}*FERREIRA SERVICES*

     Olá Ferreira! Quero contratar um serviço.

     *DADOS DA OPERAÇÃO:*
     *Serviço:* ${p.name} (${p.hours})
     *Char:* ${char}
     *Mundo:* ${world}
     *Level:* ${level}

     *AGENDAMENTO:*
     *Horário:* ${diaFull} das ${fmtInicio} às ${fmtFim} (Total: ${blockHours}h)

     *CONTATOS:*
     *WhatsApp:* ${whatsapp.trim()}
    ${discord.trim() ? `     *Discord:* ${discord.trim()}` : ""}

    --------------------------------
    Formulário enviado via https://ferreiraservice.vercel.app/ `;
}

export function OnboardingModal({ pkg, onClose }: { pkg: Pkg | null; onClose: () => void }) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [discord, setDiscord] = useState("");
  const [char, setChar] = useState("");
  const [world, setWorld] = useState("");
  const [level, setLevel] = useState("");
  const [step, setStep] = useState<Step>(0);
  const [selectedBlock, setSelectedBlock] = useState<AgendaSlot[] | null>(null);
  const [booking, setBooking] = useState(false);
  const [confirmError, setConfirmError] = useState<
    "order" | "slot" | "setup" | "backend" | null
  >(null);
  const [backendStatus, setBackendStatus] = useState<PedidosBackendStatus | null>(
    null,
  );
  const [backendChecking, setBackendChecking] = useState(false);
  const [pixBrCode, setPixBrCode] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [copyCopied, setCopyCopied] = useState(false);
  const [pixGenFailed, setPixGenFailed] = useState(false);

  useEffect(() => {
    if (pkg) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [pkg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    setBackendChecking(true);
    void probePedidosBackend().then((status) => {
      if (cancelled) return;
      setBackendStatus(status);
      setBackendChecking(false);
      if (status.status !== "ready") {
        setConfirmError("backend");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [step]);

  if (!pkg) return null;

  const duracao = Math.max(1, parseInt(pkg?.hours ?? "1", 10) || 1);

  function handleClose() {
    setStep(0);
    setSelectedBlock(null);
    setConfirmError(null);
    setPixBrCode(null);
    setWhatsappUrl(null);
    setCopyCopied(false);
    setPixGenFailed(false);
    setNome("");
    setWhatsapp("");
    setDiscord("");
    setChar("");
    setWorld("");
    setLevel("");
    onClose();
  }

  async function onCopyPix() {
    if (!pixBrCode) return;
    try {
      await navigator.clipboard.writeText(pixBrCode);
      setCopyCopied(true);
      setTimeout(() => setCopyCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  function openWhatsApp() {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    handleClose();
  }

  function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (!isValidWhatsApp(whatsapp)) return;
    setSelectedBlock(null);
    setConfirmError(null);
    setStep(1);
  }

  async function onConfirmSlot() {
    if (!selectedBlock || selectedBlock.length === 0) return;

    const backend = backendStatus ?? (await probePedidosBackend());
    setBackendStatus(backend);
    if (backend.status !== "ready") {
      setConfirmError("backend");
      return;
    }

    setBooking(true);
    setConfirmError(null);

    const p = pkg!;
    const semanaInicio = getWeekStart();
    const { dias, horarios } = agendaFromBlock(selectedBlock);
    const slotIds = selectedBlock.map((s) => s.id);
    const parsedLevel = Math.max(1, parseInt(level.replace(/\D/g, ""), 10) || 1);
    const clientName = nome.trim() || char.trim();

    const orderResult = await clientsStore.createOrder({
      nome: clientName,
      whatsapp: whatsapp.trim(),
      discord: discord.trim() || undefined,
      charNome: char.trim(),
      charLevel: parsedLevel,
      charServidor: world.trim(),
      pacoteId: p.id,
      pacoteNome: p.name,
      pacoteHoras: p.hours,
      pacotePreco: p.price,
      agendaDias: dias,
      agendaHorarios: horarios,
      slotIds,
      semanaInicio,
    });

    if (!orderResult.ok) {
      setBooking(false);
      setConfirmError(
        orderResult.reason === "setup" ? "setup" : "order",
      );
      if (orderResult.reason === "setup") {
        setBackendStatus({
          status: "setup",
          message:
            'Tabela "pedidos_cliente" ausente. Execute supabase/setup.sql no Supabase.',
        });
      }
      return;
    }

    const booked = await bookSlotBlock(slotIds, orderResult.id, semanaInicio);

    if (!booked) {
      await clientsStore.deleteOrder(orderResult.id);
      setBooking(false);
      setSelectedBlock(null);
      setConfirmError("slot");
      return;
    }

    setBooking(false);

    const dia = selectedBlock[0].dia_da_semana;
    const horaInicio = selectedBlock[0].hora_inicio;
    const horaFim = horaInicio + selectedBlock.length;
    const diaFull = DIAS_FULL_LABELS[dia] ?? dia;
    const fmtInicio = `${String(horaInicio).padStart(2, "0")}:00`;
    const fmtFim = `${String(horaFim).padStart(2, "0")}:00`;

    const brCode = generatePixBrCode(p);
    const msg = buildWhatsAppMessage({
      pkg: p,
      char,
      world,
      level,
      whatsapp,
      discord,
      diaFull,
      fmtInicio,
      fmtFim,
      blockHours: selectedBlock.length,
      includePixStatus: brCode !== null,
    });

    setPixBrCode(brCode);
    setPixGenFailed(brCode === null);
    setWhatsappUrl(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`);
    setStep(2);
  }

  const panelClass = step === 0 ? "w-full sm:max-w-md" : "w-full sm:max-w-2xl";
  const isScheduleStep = step === 1;

  return (
    <div
      className={
        isScheduleStep
          ? "fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-hidden sm:overflow-y-auto"
          : "fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      }
      style={{ animation: "fade-up 0.3s ease-out" }}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={handleClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        className={`relative ${panelClass} glass rounded-t-2xl sm:rounded-2xl shadow-[0_0_60px_rgba(0,149,255,0.2)] border-primary/30 transition-all duration-300 ${
          isScheduleStep
            ? "flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden p-4 pt-5 sm:h-auto sm:max-h-[min(92dvh,100%)] sm:p-7 sm:pt-7"
            : "p-6 sm:p-7"
        }`}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-white/50 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={`shrink-0 pr-8 ${isScheduleStep ? "sm:pr-0" : ""}`}
        >
          <div className="text-[10px] tracking-[0.22em] text-primary">
            {step === 0 ? "ONBOARDING" : step === 1 ? "AGENDAMENTO" : "PAGAMENTO"}
          </div>
          <h3
            className={`mt-1 font-semibold text-white ${
              isScheduleStep ? "text-lg leading-snug sm:mt-1.5 sm:text-xl" : "mt-1.5 text-xl"
            }`}
          >
            {pkg.name}
          </h3>
          <p
            className={`text-white/55 ${isScheduleStep ? "mt-0.5 text-xs sm:mt-1 sm:text-sm" : "mt-1 text-sm"}`}
          >
            {pkg.hours} • <span className="text-white">{pkg.price}</span>
          </p>

          <div
            className={`flex items-center gap-2 ${
              isScheduleStep ? "mt-2 sm:mt-4" : "mt-4"
            }`}
          >
          <StepDot active={step === 0} done={step > 0} label="Dados" />
          <div className="flex-1 h-px bg-white/10" />
          <StepDot active={step === 1} done={step > 1} label="Horário" />
          <div className="flex-1 h-px bg-white/10" />
          <StepDot active={step === 2} done={false} label="Pagamento" />
          </div>
        </div>

        {step === 0 && (
          <form
            onSubmit={onSubmitForm}
            className="mt-6 space-y-3"
            style={{ animation: "fade-up 0.25s ease-out" }}
          >
            <Field
              label="Seu Nome"
              value={nome}
              onChange={setNome}
              placeholder="Ex: Carlos Silva"
              required={false}
            />
            <Field
              label="WhatsApp"
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="Ex: +55 11 99999-9999"
              inputMode="tel"
            />
            <Field
              label="Discord (opcional)"
              value={discord}
              onChange={setDiscord}
              placeholder="Ex: usuario#1234"
              required={false}
            />
            <Field
              label="Nome do Personagem"
              value={char}
              onChange={setChar}
              placeholder="Ex: Knight Ferreira"
            />
            <Field
              label="Mundo / Servidor"
              value={world}
              onChange={setWorld}
              placeholder="Ex: Antica, DeusOT, Miracle..."
            />
            <Field
              label="Level Atual"
              value={level}
              onChange={setLevel}
              placeholder="Ex: 250"
              inputMode="numeric"
            />

            <button
              type="submit"
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_rgba(0,149,255,0.5)] transition hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(0,149,255,0.7)]"
            >
              <Calendar className="h-4 w-4" />
              Avançar — Escolher Horário
            </button>
          </form>
        )}

        {step === 1 && (
          <div
            className="mt-3 flex min-h-0 flex-1 flex-col sm:mt-6"
            style={{ animation: "fade-up 0.25s ease-out" }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain -mx-1 px-1 pb-2">
              <p className="text-xs text-white/50 mb-3">
                <span className="md:hidden">
                  Escolha o dia na faixa e toque no horário de início da operação de{" "}
                  <span className="text-white font-medium">{duracao}h</span>.
                </span>
                <span className="hidden md:inline">
                  Clique num bloco{" "}
                  <span className="text-cyan-400">verde</span> para selecionar o início
                  da sua operação de{" "}
                  <span className="text-white font-medium">{duracao}h</span>. O bloco
                  completo será destacado automaticamente.
                </span>
              </p>

              <AgendaGrid
                mode="client"
                duracao={duracao}
                selectedBlockIds={selectedBlock?.map((s) => s.id)}
                onSelect={(block) => {
                  setSelectedBlock(block);
                  if (confirmError === "slot") setConfirmError(null);
                }}
              />

              {backendChecking && (
                <p className="mt-3 text-xs text-white/45">Verificando conexão com o sistema…</p>
              )}
              {confirmError === "backend" && backendStatus && backendStatus.status !== "ready" && (
                <p className="mt-3 text-xs text-amber-400">
                  Pedido indisponível no momento: {backendStatus.message} O operador precisa
                  corrigir o banco antes de novos agendamentos aparecerem no painel.
                </p>
              )}
              {confirmError === "setup" && (
                <p className="mt-3 text-xs text-amber-400">
                  Banco de pedidos não configurado. Execute{" "}
                  <code className="text-amber-200">npm run db:setup</code> ou{" "}
                  <code className="text-amber-200">supabase/setup.sql</code> no dashboard do
                  Supabase — sem isso o pedido não aparece em Contratos Ativos.
                </p>
              )}
              {confirmError === "slot" && (
                <p className="mt-3 text-xs text-red-400">
                  Um ou mais horários desse bloco acabaram de ser reservados. Selecione outro.
                </p>
              )}
              {confirmError === "order" && (
                <p className="mt-3 text-xs text-red-400">
                  Não foi possível registrar o pedido. Verifique sua conexão e tente novamente.
                </p>
              )}

              {selectedBlock && selectedBlock.length > 0 && (() => {
                const startH = selectedBlock[0].hora_inicio;
                const endH = startH + selectedBlock.length;
                const dia = selectedBlock[0].dia_da_semana;
                return (
                  <p className="mt-3 text-xs text-cyan-300">
                    Selecionado:{" "}
                    <span className="font-semibold">
                      {DIAS_FULL_LABELS[dia] ?? dia}{" "}
                      das {String(startH).padStart(2, "0")}:00{" "}
                      às {String(endH).padStart(2, "0")}:00{" "}
                      ({selectedBlock.length}h)
                    </span>
                  </p>
                );
              })()}
            </div>

            <div className="shrink-0 flex gap-3 border-t border-white/10 bg-[#0a0a0c]/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:border-white/5 sm:bg-transparent sm:pt-4">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-xs font-medium text-white/60 transition hover:border-white/25 hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar
              </button>

              <button
                type="button"
                onClick={onConfirmSlot}
                disabled={
                  !selectedBlock ||
                  selectedBlock.length === 0 ||
                  booking ||
                  backendChecking ||
                  backendStatus?.status !== "ready"
                }
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_rgba(0,149,255,0.5)] transition hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(0,149,255,0.7)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {booking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {booking ? "Reservando..." : "Confirmar e Pagar com Pix"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4" style={{ animation: "fade-up 0.25s ease-out" }}>
            <div className="text-center">
              <p className="text-xs text-white/50">Valor total da operação</p>
              <p className="mt-1 text-3xl font-semibold text-white">{pkg.price}</p>
            </div>

            {pixGenFailed ? (
              <p className="text-xs text-red-400 text-center">
                Não foi possível gerar o código Pix automaticamente. Entre em contato pelo
                WhatsApp para receber os dados de pagamento.
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="text-[10px] tracking-[0.18em] text-white/50">
                    Pix Copia e Cola
                  </span>
                  <textarea
                    readOnly
                    rows={4}
                    value={pixBrCode ?? ""}
                    className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-white/80 outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={onCopyPix}
                  disabled={!pixBrCode}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Copy className="h-4 w-4" />
                  {copyCopied ? "Copiado! 🎉" : "Copiar Código Pix"}
                </button>
              </>
            )}

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              Após realizar o pagamento no app do seu banco, clique no botão abaixo para
              enviar o comprovante pelo WhatsApp.
            </div>

            <button
              type="button"
              onClick={openWhatsApp}
              disabled={!whatsappUrl}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_rgba(0,149,255,0.5)] transition hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(0,149,255,0.7)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar comprovante no WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
          active
            ? "bg-primary border-primary text-white shadow-[0_0_10px_rgba(0,149,255,0.5)]"
            : done
              ? "bg-primary/30 border-primary/50 text-primary"
              : "bg-white/5 border-white/15 text-white/30"
        }`}
      >
        {done ? "✓" : active ? "●" : "○"}
      </div>
      <span
        className={`text-[9px] tracking-widest ${
          active ? "text-primary" : done ? "text-primary/60" : "text-white/25"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text" | "tel";
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.18em] text-white/50">{label}</span>
      <input
        required={required}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-primary/60 focus:shadow-[0_0_20px_rgba(0,149,255,0.2)]"
      />
    </label>
  );
}
