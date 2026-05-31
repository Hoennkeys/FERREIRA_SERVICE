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
  const assetsDir = join(dist, "client", "assets");
  const files = readdirSync(assetsDir);
  const css = files.filter((file) => file.endsWith(".css")).map((file) => `/assets/${file}`);
  const js = files
    .filter((file) => file.endsWith(".js"))
    .sort((a, b) => b.length - a.length)
    .slice(0, 1)
    .map((file) => `/assets/${file}`);

  return {
    css,
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
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("Prepared .vercel/output for static SPA deploy");