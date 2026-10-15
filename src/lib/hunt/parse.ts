export type HuntOcrResult = {
  duration_seconds: number;
  raw_duration: string;
  loot: number;
  loot_per_hour: number;
  supplies: number;
  balance: number;
  exp_per_hour: number;
  xp_gain: number;
  profit_per_hour: number;
  timestamp: string;
};

/** '394k' -> 394000, '1,2kk' -> 1200000, '-1.234.567' -> -1234567 */
export function parseTibiaNumber(input: string): number {
  if (!input) return 0;
  let s = input.toLowerCase().replace(/\s/g, "").replace(/[oO]/g, "0");
  const neg = s.startsWith("-");
  s = s.replace(/[^0-9.,k]/g, "");
  const kCount = (s.match(/k/g) ?? []).length;
  s = s.replace(/k/g, "");
  let n: number;
  if (kCount > 0) {
    n = parseFloat(s.replace(",", ".")) || 0;
    n *= 1000 ** kCount;
  } else {
    n = parseInt(s.replace(/[.,]/g, ""), 10) || 0;
  }
  return Math.round(neg ? -n : n);
}

/** '04:14:01' | '4h 14min' | '14:01' -> segundos */
export function parseDuration(raw: string): number {
  const clock = raw.match(/(\d{1,3}):(\d{2})(?::(\d{2}))?/);
  if (clock) {
    const [, a, b, c] = clock;
    return c !== undefined
      ? +a * 3600 + +b * 60 + +c
      : +a * 60 + +b; // mm:ss
  }
  const h = raw.match(/(\d+)\s*h/i);
  const m = raw.match(/(\d+)\s*m/i);
  return (h ? +h[1] * 3600 : 0) + (m ? +m[1] * 60 : 0);
}

export function secondsToDecimalHours(s: number): number {
  return Math.round((s / 3600) * 10000) / 10000;
}

export function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

// número com sinal, tolerando ruído de OCR (O->0, espaços, k/kk)
const NUM = "([-−–—~]?\\s*[\\dOo][\\dOo.,']*\\s*(?:kk|k|K)?)";

function grab(text: string, labels: string): string {
  // permite até 3 caracteres de ruído entre rótulo e número (':', ';', '.', espaços)
  const m = text.match(new RegExp(`(?:${labels})[^\\d\\n\\-−–—~]{0,4}${NUM}`, "i"));
  return (m?.[1] ?? "").replace(/[−–—~]/, "-");
}

export function parseHuntText(text: string): HuntOcrResult {
  const clean = text.replace(/[|_]/g, " ");
  const durMatch =
    clean.match(/(?:session|sess[a-z]*|duration|dura[a-z]*)\s*[:;]?\s*(\d{1,3}:\d{2}(?::\d{2})?)/i) ??
    clean.match(/(\d{1,3}:\d{2}:\d{2})/) ??
    clean.match(/(\d{1,3}:\d{2})/);
  const raw_duration = durMatch?.[1] ?? "";
  const hour = "\\s*/\\s*h";
  const loot = parseTibiaNumber(grab(clean, `loot(?!\\s*type|\\s*stat|${hour})`));
  const supplies = parseTibiaNumber(grab(clean, `supp?[il1]+[ei]s(?!${hour})|supplies|supply`));
  const loot_per_hour = parseTibiaNumber(grab(clean, `loot${hour}`));
  const profitRaw = grab(clean, `profit(?!\\s*/)|balance(?!\\s*/)`);
  const duration_seconds = parseDuration(raw_duration);
  const balance = profitRaw ? parseTibiaNumber(profitRaw) : loot - supplies;
  let profit_per_hour = parseTibiaNumber(grab(clean, `profit${hour}|balance${hour}`));
  if (!profit_per_hour && duration_seconds) profit_per_hour = Math.round(balance / (duration_seconds / 3600));
  return {
    duration_seconds,
    raw_duration,
    loot,
    loot_per_hour,
    supplies,
    balance,
    exp_per_hour: parseTibiaNumber(grab(clean, `raw\\s*[xk]p${hour}|[xk]p${hour}|exp${hour}|exp\\s*per\\s*hour`)),
    xp_gain: parseTibiaNumber(grab(clean, "raw\\s*[xk]p\\s*gain|[xk]p\\s*gain|exp(?:erience)?\\s*gained")),
    profit_per_hour,
    timestamp: new Date().toISOString(),
  };
}
