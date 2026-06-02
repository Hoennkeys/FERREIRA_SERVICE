import { useEffect, useState, type FormEvent } from "react";
import { X, MessageCircle, Calendar, ChevronLeft, Loader2 } from "lucide-react";
import type { Pkg } from "./Pricing";
import { AgendaGrid } from "@/components/agenda/AgendaGrid";
import { bookSlot, DIAS_LABELS, type AgendaSlot } from "@/lib/agenda";

const WHATSAPP = "5581982180780";

type Step = 0 | 1;

export function OnboardingModal({ pkg, onClose }: { pkg: Pkg | null; onClose: () => void }) {
  const [char, setChar] = useState("");
  const [world, setWorld] = useState("");
  const [level, setLevel] = useState("");
  const [step, setStep] = useState<Step>(0);
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState(false);

  // Lock body scroll
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

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pkg) return null;

  function handleClose() {
    setStep(0);
    setSelectedSlot(null);
    setBookError(false);
    setChar("");
    setWorld("");
    setLevel("");
    onClose();
  }

  // Step 0 → advance to schedule picker
  function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    setSelectedSlot(null);
    setBookError(false);
    setStep(1);
  }

  // Step 1 → book slot + open WhatsApp
  async function onConfirmSlot() {
    if (!selectedSlot) return;

    setBooking(true);
    setBookError(false);

    const ok = await bookSlot(selectedSlot.id);

    setBooking(false);

    if (!ok) {
      // Slot was taken by someone else — clear selection and show error
      setSelectedSlot(null);
      setBookError(true);
      return;
    }

    const diaLabel = DIAS_LABELS[selectedSlot.dia_da_semana] ?? selectedSlot.dia_da_semana;
    const hora = `${String(selectedSlot.hora_inicio).padStart(2, "0")}:00`;

    // pkg is non-null here — component returns null when pkg is null (early return above)
    const p = pkg!;
    const msg =
      `Olá Ferreira! Quero contratar o ${p.name} (${p.hours}). ` +
      `Dados da Operação: • Char: ${char} • Mundo: ${world} • Level: ${level}. ` +
      `Horário escolhido: ${diaLabel} às ${hora}.`;

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    handleClose();
  }

  // Width expands on step 1 to fit the grid
  const panelClass =
    step === 0
      ? "w-full sm:max-w-md"
      : "w-full sm:max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      style={{ animation: "fade-up 0.3s ease-out" }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={handleClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        className={`relative ${panelClass} glass rounded-t-2xl sm:rounded-2xl p-6 sm:p-7 shadow-[0_0_60px_rgba(0,149,255,0.2)] border-primary/30 transition-all duration-300`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-white/50 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header — always visible */}
        <div className="text-[10px] tracking-[0.22em] text-primary">
          {step === 0 ? "ONBOARDING" : "AGENDAMENTO"}
        </div>
        <h3 className="mt-1.5 text-xl font-semibold text-white">{pkg.name}</h3>
        <p className="mt-1 text-sm text-white/55">
          {pkg.hours} • <span className="text-white">{pkg.price}</span>
        </p>

        {/* Step indicator */}
        <div className="mt-4 flex items-center gap-2">
          <StepDot active={step === 0} done={step > 0} label="Dados" />
          <div className="flex-1 h-px bg-white/10" />
          <StepDot active={step === 1} done={false} label="Horário" />
        </div>

        {/* ── STEP 0: form ──────────────────────────────────── */}
        {step === 0 && (
          <form
            onSubmit={onSubmitForm}
            className="mt-6 space-y-3"
            style={{ animation: "fade-up 0.25s ease-out" }}
          >
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

        {/* ── STEP 1: schedule grid ─────────────────────────── */}
        {step === 1 && (
          <div
            className="mt-6"
            style={{ animation: "fade-up 0.25s ease-out" }}
          >
            <p className="text-xs text-white/50 mb-4">
              Selecione um horário disponível{" "}
              <span className="text-cyan-400">(verde)</span> para a sua operação.
            </p>

            <AgendaGrid
              mode="client"
              selectedId={selectedSlot?.id}
              onSelect={(slot) => {
                setSelectedSlot(slot);
                setBookError(false);
              }}
            />

            {bookError && (
              <p className="mt-3 text-xs text-red-400">
                Esse horário acabou de ser reservado. Selecione outro.
              </p>
            )}

            {selectedSlot && (
              <p className="mt-3 text-xs text-cyan-300">
                Selecionado:{" "}
                <span className="font-semibold">
                  {DIAS_LABELS[selectedSlot.dia_da_semana]} às{" "}
                  {String(selectedSlot.hora_inicio).padStart(2, "0")}:00
                </span>
              </p>
            )}

            <div className="mt-5 flex gap-3">
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
                disabled={!selectedSlot || booking}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_rgba(0,149,255,0.5)] transition hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(0,149,255,0.7)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {booking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                {booking ? "Reservando..." : "Confirmar e Abrir WhatsApp"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.18em] text-white/50">{label}</span>
      <input
        required
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
