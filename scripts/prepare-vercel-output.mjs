import { readdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
// O TanStack Start joga os arquivos direto aqui durante o build da Vercel
const staticDir = join(root, ".vercel", "output", "static");
const configPath = join(root, ".vercel", "output", "config.json");
const functionsDir = join(root, ".vercel", "output", "functions");

if (!existsSync(staticDir)) {
  console.error("ERRO: Pasta static não encontrada em .vercel/output/static");
  process.exit(1);
}

// 1. Identifica os arquivos de CSS e JS gerados
const assetsDir = join(staticDir, "assets");
const files = existsSync(assetsDir) ? readdirSync(assetsDir) : [];

const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js') && f.startsWith('index-'));

// 2. Cria o HTML corrigindo o caminho dos assets e injetando o fix de hidratação
const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ferreira na Voz // Services</title>
    <script type="module">window.__TSR_DEHYDRATED__ = { data: {} };</script>
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}">` : ''}
    ${jsFile ? `<script type="module" src="/assets/${jsFile}"></script>` : ''}
  </head>
  <body><div id="root"></div></body>
</html>`;

// 3. Salva o arquivo e garante a configuração de rotas
try {
  // Escreve o index.html final
  writeFileSync(join(staticDir, "index.html"), indexHtml);
  
  // Remove a pasta de funções SSR para forçar a Vercel a usar apenas o conteúdo estático
  if (existsSync(functionsDir)) {
    rmSync(functionsDir, { recursive: true, force: true });
    console.log("Servidor SSR removido para priorizar modo Estático.");
  }

  const config = {
    version: 3,
    routes: [
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" }
    ],
    overrides: {
      "index.html": { path: "index.html", contentType: "text/html" }
    }
  };
  
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("✅ Build finalizado com sucesso! Modo SPA forçado.");
} catch (e) {
  console.error("Erro ao finalizar build:", e.message);
  process.exit(1);
}