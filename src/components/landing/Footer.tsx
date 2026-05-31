import { useState } from "react";
import { DispatchPanel } from "@/components/admin/DispatchPanel";

export function Footer() {
  const [dispatchOpen, setDispatchOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-white/5 py-10 mt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-white/80">
              FERREIRA NA VOZ <span className="text-primary">//</span> SERVICES
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/35">
            <button
              type="button"
              onClick={() => setDispatchOpen((open) => !open)}
              className="cursor-default hover:cursor-pointer text-left transition hover:text-white/50"
              aria-label="Linha de comando tática"
            >
              Ferreira na Voz <span className="text-white/25">//</span> Linha de Comando Tática ©{" "}
              {new Date().getFullYear()}
            </button>
            <span>Operações com segurança. Zero compartilhamento de dados.</span>
          </div>
        </div>
      </footer>

      {dispatchOpen && (
        <DispatchPanel open={dispatchOpen} onClose={() => setDispatchOpen(false)} />
      )}
    </>
  );
}
