import { ExternalLink, Radio } from "lucide-react";

import { TWITCH_URL } from "@/lib/twitch";

type TwitchWatchButtonProps = {
  className?: string;
  label?: string;
};

export function TwitchWatchButton({
  className = "",
  label = "Assistir na Twitch",
}: TwitchWatchButtonProps) {
  return (
    <a
      href={TWITCH_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ||
        "group inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-[11px] sm:text-xs font-medium text-white/90 transition hover:border-primary/50 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_30px_rgba(0,149,255,0.3)]"
      }
    >
      <Radio className="h-3.5 w-3.5" />
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
