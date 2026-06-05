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
  // Only patch if it's the static fallback (does not already call __nitro_vite_envs__)
  if (!original.includes("__nitro_vite_envs__")) {
    // Extract the h3 import line so we keep the same h3 reference
    const h3Import =
      original.match(/^import \{ .* \} from ".*_libs\/h3\.mjs";/m)?.[0] ?? "";
    const fallbackHtml =
      original.match(/new HTTPResponse\('([\s\S]*?)',\s*\{/)?.[1] ?? "";
    const patched = `${h3Import}
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";

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
  return new HTTPResponse(${JSON.stringify(fallbackHtml || "<!DOCTYPE html><html><body><div id='root'></div></body></html>")},
    { headers: { "content-type": "text/html; charset=utf-8" } });
}
export { renderIndexHTML as default };
`;
    writeFileSync(rendererPath, patched, "utf-8");
    console.log(`✅ Patched ${rendererPath} to call SSR service.`);
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
