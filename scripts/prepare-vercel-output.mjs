import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const output = join(root, ".vercel", "output");

if (!existsSync(join(dist, "client"))) {
  console.error("Missing dist/client — run `npm run build` first.");
  process.exit(1);
}

function readRootAssets() {
  const manifestDir = join(dist, "server");
  let manifestFile = null;
  
  if (existsSync(manifestDir)) {
    manifestFile = readdirSync(manifestDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.startsWith("_tanstack-start-manifest_v-"))
      .map((entry) => entry.name)[0];
  }

  if (manifestFile) {
    const source = readFileSync(join(manifestDir, manifestFile), "utf8");
    const css = [...source.matchAll(/"(\/assets\/[^"]+\.css)"/g)].map((match) => match[1]);
    const scripts = [...source.matchAll(/src:\s*"(\/assets\/[^"]+\.js)"/g)].map((match) => match[1]);
    const preloads = [...source.matchAll(/preloads:\s*\["(\/assets\/[^"]+\.js)"/g)].map((match) => match[1]);

    const rootMatch = source.match(/__root__:\s*\{[\s\S]*?preloads:\s*\["(\/assets\/[^"]+\.js)"/);
    const mainScript = rootMatch?.[1] ?? preloads[0] ?? scripts[0];

    if (mainScript || css.length > 0) {
      return {
        css: [...new Set(css.filter((file) => file.endsWith(".css")))],
        preloads: [],
        scripts: mainScript ? [mainScript] : [],
      };
    }
  }

  // --- CORREÇÃO AQUI: Busca robusta de CSS e JS ---
  const cssPaths = [];
  const clientDir = join(dist, "client");
  const assetsDir = join(clientDir, "assets");

  // 1. Procura CSS na raiz do client (onde o Tailwind v4 costuma jogar o styles.css)
  if (existsSync(clientDir)) {
    const rootFiles = readdirSync(clientDir);
    rootFiles.forEach(file => {
      if (file.endsWith(".css")) cssPaths.push(`/${file}`);
    });
  }

  // 2. Procura CSS e JS dentro da pasta assets
  let jsPaths = [];
  if (existsSync(assetsDir)) {
    const assetsFiles = readdirSync(assetsDir);
    assetsFiles.forEach(file => {
      if (file.endsWith(".css")) cssPaths.push(`/assets/${file}`);
      if (file.endsWith(".js")) jsPaths.push(`/assets/${file}`);
    });
  }

  const js = jsPaths
    .sort((a, b) => b.length - a.length)
    .slice(0, 1);

  return {
    css: [...new Set(cssPaths)], // Evita caminhos duplicados
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
          headers: {
            "cache-control": "public, max-age=31536000, immutable",
          },
          src: "/assets/(.*)",
        },
        // Configuração para garantir cache também nos arquivos CSS que ficarem na raiz do build
        {
          headers: {
            "cache-control": "public, max-age=31536000, immutable",
          },
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

console.log("Prepared .vercel/output for static SPA deploy with Tailwind v4 support");