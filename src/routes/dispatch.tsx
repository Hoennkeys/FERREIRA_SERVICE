import { createFileRoute } from "@tanstack/react-router";

import { PanelLayout } from "@/components/panel/PanelLayout";
import { AuthPending } from "@/components/auth/AuthPending";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
  return (
    <ProtectedRoute>
      <PanelLayout />
    </ProtectedRoute>
  );
}
