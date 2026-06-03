import { useState } from "react";

import { PanelSidebar } from "./PanelSidebar";
import { AgendaTab } from "./tabs/AgendaTab";
import { ClientsTab } from "./tabs/ClientsTab";
import { TelemetryTab } from "./tabs/TelemetryTab";
import { WhatsAppTab } from "./tabs/WhatsAppTab";
import type { PanelTab } from "./types";

export function PanelLayout() {
  const [activeTab, setActiveTab] = useState<PanelTab>("clients");

  return (
    <div className="flex h-screen overflow-hidden bg-[#060606] text-foreground">
      <PanelSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto bg-[#060606] p-4 sm:p-6">
        <div
          key={activeTab}
          className="mx-auto max-w-6xl opacity-100 transition-opacity duration-200"
          style={{ animation: "fade-up 0.2s ease-out" }}
        >
          {activeTab === "telemetry" && <TelemetryTab />}
          {activeTab === "agenda" && <AgendaTab />}
          {activeTab === "whatsapp" && <WhatsAppTab />}
          {activeTab === "clients" && <ClientsTab />}
        </div>
      </main>
    </div>
  );
}
