import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

const WHATSAPP = "5581982180780";
const MSG =
  "Olá Ferreira! Estou no site e gostaria de tirar uma dúvida sobre os serviços de Uptime e XP.";

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 400);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-3 inset-x-3 z-40 md:hidden transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6 pointer-events-none"
      }`}
    >
      <a
        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MSG)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_40px_rgba(0,149,255,0.6)]"
      >
        <MessageCircle className="h-4 w-4" />
        Falar Direto com Ferreira
      </a>
    </div>
  );
}
