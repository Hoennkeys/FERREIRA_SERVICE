import { Twitch, Instagram, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 mt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-white/80">
            FERREIRA NA VOZ <span className="text-primary">//</span> SERVICES
          </div>
          <div className="flex items-center gap-3">
            <SocialLink href="https://twitch.tv/ferreiranavoz" label="Twitch">
              <Twitch className="h-4 w-4" />
            </SocialLink>
            <SocialLink href="https://instagram.com/ferreiranavoz" label="Instagram">
              <Instagram className="h-4 w-4" />
            </SocialLink>
            <SocialLink href="https://youtube.com/@ferreiranavoz" label="YouTube">
              <Youtube className="h-4 w-4" />
            </SocialLink>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/35">
          <span>© {new Date().getFullYear()} Ferreira na Voz. Todos os direitos reservados.</span>
          <span>Operações com segurança militar. Zero compartilhamento de dados.</span>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="grid place-items-center h-9 w-9 rounded-full border border-white/10 text-white/60 transition hover:border-primary/40 hover:text-primary hover:shadow-[0_0_20px_rgba(0,149,255,0.3)]"
    >
      {children}
    </a>
  );
}
