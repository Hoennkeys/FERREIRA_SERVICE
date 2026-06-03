import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  ExternalLink,
  LogOut,
  MessageSquare,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { filterVisibleClients, useClients } from "@/lib/clients";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { PANEL_TABS, type PanelTab } from "./types";

const TWITCH_URL = "https://twitch.tv/ferreiranavoz";

const TAB_ICONS: Record<PanelTab, LucideIcon> = {
  telemetry: Activity,
  agenda: CalendarDays,
  whatsapp: MessageSquare,
  clients: Users,
};

type PanelSidebarProps = {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
};

export function PanelSidebar({ activeTab, onTabChange }: PanelSidebarProps) {
  const navigate = useNavigate();
  const { clients } = useClients();
  const [operatorEmail, setOperatorEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const pendingCount = filterVisibleClients(clients).filter(
    (c) => c.status === "Pendente",
  ).length;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOperatorEmail(data.session?.user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <aside className="flex h-full w-20 shrink-0 flex-col border-r border-zinc-800 bg-[#0c0c0e] md:w-64">
      {/* Logo + status */}
      <div className="border-b border-zinc-800 px-3 py-4 md:px-5">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          />
          <div className="min-w-0 hidden md:block">
            <p className="truncate text-xs font-semibold tracking-wide text-white">
              Ferreira na Voz
            </p>
            <p className="text-[9px] tracking-[0.18em] text-emerald-400/80">
              OPERACIONAL
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-4 md:px-3">
        {PANEL_TABS.map(({ id, label }) => {
          const Icon = TAB_ICONS[id];
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              title={label}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200",
                isActive
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.12)]"
                  : "border border-transparent text-white/50 hover:border-zinc-700 hover:bg-white/[0.03] hover:text-white/80",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden text-sm font-medium md:inline">{label}</span>
              {id === "clients" && pendingCount > 0 && (
                <span className="ml-auto hidden min-w-[1.25rem] rounded-full bg-amber-500/20 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-300 md:inline">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-2 py-4 md:px-4 space-y-3">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sair da conta"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-[#0d0d10] px-2 py-2 text-[10px] font-medium tracking-[0.12em] text-white/50 transition hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50 md:justify-start md:px-3"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">
            {signingOut ? "SAINDO…" : "SAIR DA CONTA"}
          </span>
        </button>
        <a
          href={TWITCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-[#0d0d10] px-2 py-2 text-[10px] font-medium tracking-[0.12em] text-cyan-400 transition hover:border-cyan-500/30 hover:bg-cyan-500/5 md:justify-start md:px-3"
          title="Abrir Twitch"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">Twitch Live</span>
        </a>
        {operatorEmail && (
          <div className="hidden truncate px-1 text-[10px] text-white/35 md:block">
            // {operatorEmail}
          </div>
        )}
      </div>
    </aside>
  );
}
