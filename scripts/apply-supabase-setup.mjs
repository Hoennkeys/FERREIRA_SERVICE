/**
 * Aplica supabase/setup.sql no projeto remoto.
 *
 * Uso:
 *   1. Supabase Dashboard → Project Settings → Database → Connection string (URI)
 *   2. Adicione ao .env: SUPABASE_DB_URL=postgresql://postgres.[ref]:[SENHA]@...
 *   3. npm run db:setup
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error(`
❌ SUPABASE_DB_URL não configurada.

1. Abra: https://supabase.com/dashboard/project/mtifrsbmewdunjqgltfq/settings/database
2. Copie a Connection string (URI) — modo "Session" ou "Direct"
3. Adicione ao .env:

   SUPABASE_DB_URL=postgresql://postgres.[ref]:[SUA-SENHA]@...

4. Rode novamente: npm run db:setup

Alternativa manual: cole supabase/setup.sql no SQL Editor do Supabase.
`);
  process.exit(1);
}

const sqlPath = join(root, "supabase", "setup.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log("Conectando ao Postgres…");
  await client.connect();
  console.log("Executando supabase/setup.sql…");
  await client.query(sql);
  console.log("✅ Setup concluído. Recarregue a homepage e teste um pedido.");
} catch (err) {
  console.error("❌ Erro ao aplicar setup:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
