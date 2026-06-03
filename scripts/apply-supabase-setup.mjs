/**
 * Aplica supabase/setup.sql no projeto remoto.
 *
 * Opção A — Postgres direto (.env):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[SENHA]@...
 *   npm run db:setup
 *
 * Opção B — Management API (sem senha do banco):
 *   Token: https://supabase.com/dashboard/account/tokens
 *   SUPABASE_ACCESS_TOKEN=sbp_...
 *   npm run db:setup
 *
 * Opção C — Supabase CLI já logado:
 *   supabase login && npm run db:setup
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function projectRefFromEnv() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? process.env.SUPABASE_PROJECT_REF ?? null;
}

async function applyViaPostgres(dbUrl, sql) {
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  try {
    console.log("Conectando ao Postgres…");
    await client.connect();
    console.log("Executando supabase/setup.sql…");
    await client.query(sql);
    console.log("✅ Setup concluído via Postgres.");
    return true;
  } finally {
    await client.end();
  }
}

async function applyViaManagementApi(projectRef, accessToken, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${body.slice(0, 500)}`);
  }

  console.log("✅ Setup concluído via Management API.");
  if (body && body !== "[]") {
    console.log("Resposta:", body.slice(0, 300));
  }
  return true;
}

function applyViaSupabaseCli(sqlPath) {
  console.log("Tentando Supabase CLI (npx supabase login + link no projeto)…");
  const result = spawnSync(
    "npx",
    ["supabase", "db", "query", "-f", sqlPath, "--linked", "--yes"],
    { cwd: root, stdio: "inherit", shell: true },
  );
  return result.status === 0;
}

loadEnvFile();

const sqlPath = join(root, "supabase", "setup.sql");
const sql = readFileSync(sqlPath, "utf8");
const projectRef = projectRefFromEnv();
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function main() {
  try {
    if (dbUrl) {
      await applyViaPostgres(dbUrl, sql);
      return;
    }

    if (accessToken && projectRef) {
      await applyViaManagementApi(projectRef, accessToken, sql);
      return;
    }

    if (projectRef && applyViaSupabaseCli(sqlPath)) {
      return;
    }

    const ref = projectRef ?? "SEU_PROJECT_REF";
    console.error(`
❌ Não foi possível aplicar o setup automaticamente.

Faltam credenciais de administrador do banco. Escolha UMA opção:

【Opção A — mais rápida】Management API (sem senha do Postgres)
  1. https://supabase.com/dashboard/account/tokens → Generate new token
  2. No arquivo .env adicione:
     SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx
  3. npm run db:setup

【Opção B】Connection string do banco
  1. https://supabase.com/dashboard/project/${ref}/settings/database
  2. Copie Connection string (URI) e adicione ao .env:
     SUPABASE_DB_URL=postgresql://postgres.${ref}:[SENHA]@...
  3. npm run db:setup

【Opção C】Supabase CLI
  npx supabase login
  npm run db:setup

【Manual】Cole supabase/setup.sql no SQL Editor do Supabase.
`);
    process.exit(1);
  } catch (err) {
    console.error("❌ Erro ao aplicar setup:", err.message);
    process.exit(1);
  }
}

void main();
