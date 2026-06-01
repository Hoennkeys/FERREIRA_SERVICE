import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const configPath = join(root, ".vercel", "output", "config.json");

// Garantimos apenas que o roteamento básico da Vercel encaminhe os assets corretamente
try {
  const config = {
    version: 3,
    routes: [
      { handle: "filesystem" },
      { src: "/assets/(.*)", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
      { src: "/(.*)", dest: "/" }
    ]
  };
  
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("✅ Configuração de rotas da Vercel atualizada com sucesso!");
} catch (e) {
  console.error("Erro ao configurar o arquivo config.json da Vercel:", e.message);
  process.exit(1);
}