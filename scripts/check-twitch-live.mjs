/**
 * Testa TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET (lê .env na raiz).
 * Uso: npm run twitch:check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANNEL = "ferreiranavoz";

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    console.warn("Arquivo .env não encontrado na raiz do projeto.\n");
    return;
  }
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function getAppToken(clientId, clientSecret) {
  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function getStreamStatus(clientId, token) {
  const url = new URL("https://api.twitch.tv/helix/streams");
  url.searchParams.set("user_login", CHANNEL);

  const res = await fetch(url, {
    headers: {
      "Client-Id": clientId,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Helix HTTP ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data?.[0] ?? null;
}

async function main() {
  loadDotEnv();

  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    console.error("Faltam TWITCH_CLIENT_ID e/ou TWITCH_CLIENT_SECRET no .env");
    console.error("Veja docs/TWITCH_SETUP.md");
    process.exit(1);
  }

  console.log(`Canal: ${CHANNEL}`);
  console.log("Obtendo token…");

  const token = await getAppToken(clientId, clientSecret);
  console.log("Consultando live…\n");

  const stream = await getStreamStatus(clientId, token);

  if (stream) {
    console.log("OK — AO VIVO");
    console.log(`  Título: ${stream.title}`);
    console.log(`  Viewers: ${stream.viewer_count}`);
  } else {
    console.log(
      "OK — credenciais válidas, mas o canal NÃO está ao vivo agora.",
    );
    console.log(
      "  Entre na Twitch e rode de novo, ou teste a homepage quando estiver live.",
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
