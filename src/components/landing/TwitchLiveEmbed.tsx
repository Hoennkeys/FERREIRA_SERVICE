import { useEffect, useState } from "react";

import { buildTwitchPlayerSrc } from "@/lib/twitch";

/**
 * Player oficial da Twitch — só monta no cliente (parent depende de window.location).
 */
export function TwitchLiveEmbed() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(buildTwitchPlayerSrc());
  }, []);

  if (!src) {
    return (
      <div
        className="aspect-video w-full animate-pulse rounded-xl border border-white/10 bg-black/50"
        aria-hidden
      />
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_40px_rgba(0,149,255,0.15)]">
      <iframe
        title="Transmissão ao vivo — Ferreira na Voz"
        src={src}
        className="h-full w-full"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
      />
    </div>
  );
}
