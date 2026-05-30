import { useEffect, useState, type FormEvent } from "react";
import { X, MessageCircle } from "lucide-react";
import type { Pkg } from "./Pricing";

const WHATSAPP = "5581982180780";

export function OnboardingModal({ pkg, onClose }: { pkg: Pkg | null; onClose: () => void }) {
  const [char, setChar] = useState("");
  const [world, setWorld] = useState("");
  const [level, setLevel] = useState("");

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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pkg) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const msg = `Olá Ferreira! Quero contratar o ${pkg.name} (${pkg.hours}). Dados da Operação: • Char: ${char} • Mundo: ${world} • Level: ${level}. Gostaria de verificar a disponibilidade de horário.`;
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
    setChar("");
    setWorld("");
    setLevel("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: "fade-up 0.3s ease-out" }}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative w-full sm:max-w-md glass rounded-t-2xl sm:rounded-2xl p-6 sm:p-7 shadow-[0_0_60px_rgba(0,149,255,0.2)] border-primary/30">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-white/50 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-[10px] tracking-[0.22em] text-primary">ONBOARDING</div>
        <h3 className="mt-1.5 text-xl font-semibold text-white">{pkg.name}</h3>
        <p className="mt-1 text-sm text-white/55">
          {pkg.hours} • <span className="text-white">{pkg.price}</span>
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Field label="Nome do Personagem" value={char} onChange={setChar} placeholder="Ex: Knight Ferreira" />
          <Field label="Mundo / Servidor" value={world} onChange={setWorld} placeholder="Ex: Antica, DeusOT, Miracle..." />
          <Field label="Level Atual" value={level} onChange={setLevel} placeholder="Ex: 250" inputMode="numeric" />

          <button
            type="submit"
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_rgba(0,149,255,0.5)] transition hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(0,149,255,0.7)]"
          >
            <MessageCircle className="h-4 w-4" />
            Confirmar e Iniciar Operação via WhatsApp
          </button>
        </form>
      </div>
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
