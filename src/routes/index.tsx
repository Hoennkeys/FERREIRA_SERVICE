import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { MetricsStrip } from "@/components/landing/MetricsStrip";
import { OperationsDashboard } from "@/components/landing/OperationsDashboard";
import { Pricing } from "@/components/landing/Pricing";
import { About } from "@/components/landing/About";
import { Footer } from "@/components/landing/Footer";
import { StickyMobileCTA } from "@/components/landing/StickyMobileCTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Ferreira na Voz // Services — Operações de alta performance para Tibia",
      },
      {
        name: "description",
        content:
          "Divisão de serviços premium da Ferreira na Voz. Escale level, conquistas e rendimento da sua conta de Tibia com segurança militar e zero delevel.",
      },
      { property: "og:title", content: "Ferreira na Voz // Services" },
      {
        property: "og:description",
        content:
          "Operações de alta performance para Tibia: 100% segurança, 0% delevel, monitoramento 24/7.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <MetricsStrip />
        <OperationsDashboard />
        <Pricing />
        <About />
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
}
