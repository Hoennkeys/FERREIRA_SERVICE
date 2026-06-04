import { createFileRoute } from "@tanstack/react-router";

import { PanelLayout } from "@/components/panel/PanelLayout";
import { AuthPending } from "@/components/auth/AuthPending";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { requireAdmin } from "@/lib/auth";

export const Route = createFileRoute("/dispatch")({
  beforeLoad: async ({ location }) => {
    await requireAdmin({ redirectTo: location.pathname });
  },
  pendingComponent: AuthPending,
  head: () => ({
    meta: [{ title: "Ferreira na Voz // Dispatch — Linha de Comando Tática" }],
  }),
  component: DispatchPage,
});

function DispatchPage() {
  return (
    <ProtectedRoute>
      <PanelLayout />
    </ProtectedRoute>
  );
}
