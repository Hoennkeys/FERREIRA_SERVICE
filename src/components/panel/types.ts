export type PanelTab = "telemetry" | "agenda" | "whatsapp" | "clients";

export const PANEL_TABS: {
  id: PanelTab;
  label: string;
}[] = [
  { id: "telemetry", label: "Telemetria" },
  { id: "agenda", label: "Agenda" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "clients", label: "Clientes" },
];
