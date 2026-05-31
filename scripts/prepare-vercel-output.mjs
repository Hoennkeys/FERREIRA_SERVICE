import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const output = join(root, ".vercel", "output");

// Garante que a pasta client exista
if (!existsSync(join(dist, "client"))) {
  console.error("Missing dist/client — run `npm run build` first.");
  process.exit(1);
}

function readRootAssets() {
  const cssPaths = [];
  let jsPaths = [];

  const clientDir = join(dist, "client");
  const assetsDir = join(clientDir, "assets");

  // 1. Vasculha arquivos de estilo na raiz do client (Padrão Tailwind v4)
  if (existsSync(clientDir)) {
    try {
      const rootFiles = readdirSync(clientDir);
      rootFiles.forEach(file => {
        if (file.endsWith(".css")) cssPaths.push(`/${file}`);
      });
    } catch (e) {
      console.log("Aviso ao ler clientDir:", e.message);
    }
  }

  // 2. Vasculha arquivos na pasta assets (Padrão Vite tradicional)
  if (existsSync(assetsDir)) {
    try {
      const assetsFiles = readdirSync(assetsDir);
      assetsFiles.forEach(file => {
        if (file.endsWith(".css")) cssPaths.push(`/assets/${file}`);
        if (file.endsWith(".js")) jsPaths.push(`/assets/${file}`);
      });
    } catch (e) {
      console.log("Aviso ao ler assetsDir:", e.message);
    }
  }

  // Se por algum motivo o build não gerou arquivos conhecidos, força o fallback seguro
  if (cssPaths.length === 0) {
    cssPaths.push("/styles.css");
  }

  const js = jsPaths.sort((a, b) => b.length - a.length).slice(0, 1);

  return {
    css: [...new Set(cssPaths)],
    preloads: js,
    scripts: js,
  };
}

function buildIndexHtml({ css, preloads, scripts }) {
  const stylesheetTags = css
    .map((href) => `    <link rel="stylesheet" crossorigin href="${href}">`)
    .join("\n");
  const preloadTags = preloads
    .filter((href) => !scripts.includes(href))
    .map((href) => `    <link rel="modulepreload" crossorigin href="${href}">`)
    .join("\n");
  const scriptTags = scripts
    .map((src) => `    <script type="module" crossorigin src="${src}"></script>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ferreira na Voz // Services</title>
    <meta name="description" content="Divisão de serviços premium da Ferreira na Voz. Escale level, conquistas e rendimento da sua conta de Tibia com segurança militar e zero delevel." />
${stylesheetTags}
${preloadTags}
${scriptTags}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
}

// Execução do script de saída da Vercel
try {
  rmSync(output, { recursive: true, force: true });
  mkdirSync(join(output, "static"), { recursive: true });

  cpSync(join(dist, "client"), join(output, "static"), { recursive: true });

  const assets = readRootAssets();
  writeFileSync(join(output, "static", "index.html"), buildIndexHtml(assets));

  writeFileSync(
    join(output, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [
          {
            headers: { "cache-control": "public, max-age=31536000, immutable" },
            src: "/assets/(.*)",
          },
          {
            headers: { "cache-control": "public, max-age=31536000, immutable" },
            src: "/(.*).css",
          },
          { handle: "filesystem" },
          { src: "/(.*)", dest: "/index.html" },
        ],
      },
      null,
      2,
    ),
  );

  console.log("Successfully prepared .vercel/output with crash protection!");
} catch (error) {
  console.error("Erro crítico ao preparar saída da Vercel:", error);
  process.exit(1);
}