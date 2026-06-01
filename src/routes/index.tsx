import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { MetricsStrip } from "@/components/landing/MetricsStrip";
import { LiveTelemetryClient } from "@/components/landing/LiveTelemetryClient";
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
  // #region agent log
  useEffect(() => {
    const EP = 'http://127.0.0.1:7583/ingest/04cf47b3-a32f-4a0e-b26f-aac6b6a736d3';
    fetch(EP, {method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7b787a'},body:JSON.stringify({sessionId:'7b787a',location:'index.tsx:Index',message:'Index route rendered (client)',data:{url:window.location.href},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
  }, []);
  // #endregion

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <MetricsStrip />
        <LiveTelemetryClient />
        <Pricing />
        <About />
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
}
