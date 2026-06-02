import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AgendaAdmin } from "@/components/admin/AgendaAdmin";
import { DispatchPanel } from "@/components/admin/DispatchPanel";
import { AuthPending } from "@/components/auth/AuthPending";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OperationsDashboard } from "@/components/landing/OperationsDashboard";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/dispatch")({
  beforeLoad: async ({ location }) => {
    await requireAuth({ redirectTo: location.pathname });
  },
  pendingComponent: AuthPending,
  head: () => ({
    meta: [{ title: "Ferreira na Voz // Dispatch — Linha de Comando Tática" }],
  }),
  component: DispatchPage,
});

function DispatchPage() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="relative min-h-screen bg-background text-foreground">
        <OperationsDashboard />

        <AgendaAdmin />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-xs font-semibold tracking-[0.14em] text-primary transition hover:bg-primary/20 hover:shadow-[0_0_30px_rgba(0,149,255,0.25)]"
          >
            ABRIR LINHA DE COMANDO TÁTICA
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-xs font-medium tracking-[0.14em] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            ← VOLTAR PARA A LANDING
          </Link>
        </div>

        {panelOpen && (
          <DispatchPanel open onClose={() => setPanelOpen(false)} />
        )}
      </div>
    </ProtectedRoute>
  );
}
