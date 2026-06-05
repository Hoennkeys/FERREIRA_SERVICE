import { Radio } from "lucide-react";

const TWITCH_URL = "https://twitch.tv/ferreiranavoz";

export function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <a
          href="#top"
          className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] text-white"
        >
          FERREIRA NA VOZ <span className="text-primary">//</span> SERVICES
        </a>
        <a
          href={TWITCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-primary/40 hover:text-white hover:shadow-[0_0_20px_rgba(0,149,255,0.25)]"
        >
          <Radio className="h-3.5 w-3.5 text-primary drop-shadow-[0_0_6px_rgba(0,149,255,0.8)]" />
          Twitch Live
        </a>
      </div>
    </header>
  );
}
