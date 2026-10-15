import { parseHuntText, type HuntOcrResult } from "./parse";

/** Upscale + escala de cinza + threshold binário (fonte bitmap do Tibia). */
export async function preprocessImage(
  file: Blob,
  opts: { crop?: { x: number; y: number; w: number; h: number }; scale?: number; threshold?: number } = {},
): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const scale = opts.scale ?? 3;
  // crop em frações (0..1) da imagem original: bounding box da área de interesse
  const c = opts.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = bmp.width * c.x, sy = bmp.height * c.y;
  const sw = bmp.width * c.w, sh = bmp.height * c.h;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false; // preserva pixels da fonte bitmap
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const th = opts.threshold ?? 140;
  // texto do Tibia é claro sobre fundo escuro: inverte para preto no branco
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = g > th ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export async function runHuntOcr(
  file: Blob,
  onProgress?: (p: number) => void,
): Promise<HuntOcrResult & { rawText: string }> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: "6" as never });
    // passada 1: imagem inteira binarizada; passada 2: sem threshold (cronômetro Windows)
    const a = await preprocessImage(file);
    const r1 = await worker.recognize(a);
    let result = parseHuntText(r1.data.text);
    if (!result.duration_seconds) {
      const b = await preprocessImage(file, { threshold: 255, scale: 2 });
      const r2 = await worker.recognize(b);
      result = parseHuntText(r2.data.text + "\n" + r1.data.text);
      return { ...result, rawText: r2.data.text };
    }
    return { ...result, rawText: r1.data.text };
  } finally {
    await worker.terminate();
  }
}
