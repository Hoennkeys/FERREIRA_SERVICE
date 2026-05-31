import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const output = join(root, ".vercel", "output");

// 1. Limpa e cria as pastas de saída da Vercel
try {
  if (existsSync(output)) rmSync(output, { recursive: true, force: true });
  mkdirSync(join(output, "static"), { recursive: true });
} catch (e) {
  console.error("Erro ao preparar pastas:", e.message);
}

// 2. Copia os arquivos do build do cliente
const clientDist = join(dist, "client");
if (existsSync(clientDist)) {
  cpSync(clientDist, join(output, "static"), { recursive: true });
} else {
  console.error("ERRO: Pasta dist/client não encontrada!");
  process.exit(1);
}

// 3. Define o HTML básico com o fix de hidratação para o TanStack Router
const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ferreira na Voz // Services</title>
    <script type="module">window.__TSR_DEHYDRATED__ = { data: {} };</script>
    <link rel="stylesheet" href="/styles.css">
    <script type="module" src="/assets/index.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`;

// 4. Salva o index.html e a configuração de rotas da Vercel
try {
  writeFileSync(join(output, "static", "index.html"), indexHtml);
  writeFileSync(
    join(output, "config.json"),
    JSON.stringify({
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" }
      ]
    }, null, 2)
  );
  console.log("Build concluído com sucesso!");
} catch (e) {
  console.error("Erro ao gravar arquivos finais:", e.message);
  process.exit(1);
}