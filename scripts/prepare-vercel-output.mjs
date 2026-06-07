import {
  existsSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const funcRoot = join(root, ".vercel", "output", "functions", "__server.func");
const staticRoot = join(root, ".vercel", "output", "static");
const configPath = join(root, ".vercel", "output", "config.json");

/** Nitro/Vite may bundle h3 as `h3.mjs` or `h3+rou3+srvx.mjs` — resolve at build time. */
function resolveHttpResponseImport(funcRoot) {
  const libsDir = join(funcRoot, "_libs");
  if (!existsSync(libsDir)) return null;

  for (const file of readdirSync(libsDir)) {
    if (!file.endsWith(".mjs") || !file.includes("h3")) continue;

    const content = readFileSync(join(libsDir, file), "utf-8");
    if (!content.includes("HTTPResponse")) continue;

    const exportLine = content.match(/export\s*\{([^}]+)\}/)?.[1] ?? "";
    const alias = exportLine.match(/HTTPResponse as (\w+)/)?.[1];
    if (alias) {
      return `import { ${alias} as HTTPResponse } from "../_libs/${file}";`;
    }
    if (exportLine.includes("HTTPResponse")) {
      return `import { HTTPResponse } from "../_libs/${file}";`;
    }
  }

  return null;
}

// ─── 1. Remove static index.html ────────────────────────────────────────────
// Vercel's "handle: filesystem" would serve the raw index.html shell (no
// bundled scripts) before the SSR function gets a chance to render the page.
const staticIndex = join(staticRoot, "index.html");
if (existsSync(staticIndex)) {
  rmSync(staticIndex);
  console.log(
    "🗑️  Removed static/index.html so SSR function handles root requests.",
  );
} else {
  console.log("ℹ️  static/index.html not found — nothing to remove.");
}

// ─── 2. Patch renderer-template.mjs to call the SSR service ─────────────────
// TanStack Start compiles a CSR fallback renderer (_chunks/renderer-template.mjs)
// that serves the raw index.html template without invoking the SSR service.
// This patch replaces it so the handler calls globalThis.__nitro_vite_envs__.ssr
// (our server.ts → @tanstack/react-start/server-entry) to SSR-render the page.
const chunksDir = join(funcRoot, "_chunks");
let rendererPath = null;
if (existsSync(chunksDir)) {
  for (const f of readdirSync(chunksDir)) {
    if (f.startsWith("renderer-template") && f.endsWith(".mjs")) {
      rendererPath = join(chunksDir, f);
      break;
    }
  }
}

if (rendererPath) {
  const original = readFileSync(rendererPath, "utf-8");
  const hasBrokenSideImports =
    original.includes("../_libs/rou3.mjs") &&
    !existsSync(join(funcRoot, "_libs", "rou3.mjs"));
  const needsPatch =
    !original.includes("__nitro_vite_envs__") || hasBrokenSideImports;

  if (needsPatch) {
    const httpResponseImport = resolveHttpResponseImport(funcRoot);
    if (!httpResponseImport) {
      console.warn(
        "⚠️  Could not resolve HTTPResponse import — skipping SSR patch.",
      );
    } else {
      const fallbackHtml =
        original.match(/new HTTPResponse\('([\s\S]*?)',\s*\{/)?.[1] ??
        original.match(/new HTTPResponse\("([\s\S]*?)",\s*\{/)?.[1] ??
        "";
      const fallbackLiteral =
        fallbackHtml && !fallbackHtml.startsWith("JSON.stringify")
          ? fallbackHtml
          : "<!DOCTYPE html><html><body><div id='root'></div></body></html>";
      const patched = `${httpResponseImport}

async function renderIndexHTML(event) {
  const ssr = globalThis.__nitro_vite_envs__?.ssr;
  if (ssr) {
    try {
      return await ssr.fetch(event.req);
    } catch (err) {
      console.error("[renderer-template] SSR service threw:", err);
    }
  }
  // Fallback: bare shell so the browser at least gets a parseable document
  return new HTTPResponse(${JSON.stringify(fallbackLiteral)},
    { headers: { "content-type": "text/html; charset=utf-8" } });
}
export { renderIndexHTML as default };
`;
      writeFileSync(rendererPath, patched, "utf-8");
      console.log(`✅ Patched ${rendererPath} to call SSR service.`);
    }
  } else {
    console.log(
      "ℹ️  renderer-template.mjs already calls SSR service — no patch needed.",
    );
  }
} else {
  console.warn("⚠️  renderer-template.mjs not found — skipping SSR patch.");
}

// ─── 3. Verify config.json routes to /__server ───────────────────────────────
try {
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  const hasSsrRoute = config.routes?.some(
    (r) => typeof r.dest === "string" && r.dest.includes("__server"),
  );
  if (!hasSsrRoute) {
    console.warn("⚠️  No __server route in config.json — patching.");
    config.routes = [
      {
        src: "/assets/(.*)",
        headers: { "cache-control": "public, max-age=31536000, immutable" },
        continue: true,
      },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/__server" },
    ];
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("✅ config.json patched with SSR route.");
  } else {
    console.log("✅ config.json already routes to __server.");
  }
} catch (e) {
  console.error("Erro ao verificar config.json:", e.message);
  process.exit(1);
}
