import { existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const staticRoot = join(root, ".vercel", "output", "static");
const configPath = join(root, ".vercel", "output", "config.json");

// Remove index.html from the static output so Vercel's "handle: filesystem"
// does not serve the shell HTML (which has no <script> entry) before the SSR
// function has a chance to render the page.
const staticIndex = join(staticRoot, "index.html");
if (existsSync(staticIndex)) {
  rmSync(staticIndex);
  console.log("🗑️  Removed static/index.html so SSR function handles all root requests.");
} else {
  console.log("ℹ️  static/index.html not found — nothing to remove.");
}

// Verify the nitro-generated config.json still routes to /__server correctly.
// Only patch it if the SSR dest is missing (should not normally happen).
try {
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  const hasSsrRoute = config.routes?.some(
    (r) => typeof r.dest === "string" && r.dest.includes("__server"),
  );
  if (!hasSsrRoute) {
    console.warn("⚠️  No __server route found in config.json — patching with SSR fallback.");
    config.routes = [
      ...(config.routes ?? []).filter((r) => r.handle !== "filesystem" && !r.src?.includes("(.*)")),
      { src: "/assets/(.*)", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/__server" },
    ];
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("✅ config.json patched with SSR fallback route.");
  } else {
    console.log("✅ config.json already has SSR route — no changes needed.");
  }
} catch (e) {
  console.error("Erro ao verificar config.json:", e.message);
  process.exit(1);
}
