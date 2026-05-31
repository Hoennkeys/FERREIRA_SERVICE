import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/** Local dev/preview port only — production on Vercel is unaffected. */
const DEV_PORT = 5173;

export default defineConfig({
  plugins: [tanstackStart(), nitro({ preset: "vercel" }), react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: DEV_PORT,
    strictPort: true,
  },
  preview: {
    port: DEV_PORT,
    strictPort: true,
  },
});
