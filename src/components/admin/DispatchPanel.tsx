import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { X, Trash2, Image, CopyCheck, Upload, ListOrdered, AlertTriangle, MessageSquare } from "lucide-react";
import {
  clearFlyerPng,
  loadFlyerPng,
  saveFlyerPng,
} from "@/lib/dispatch-flyer-store";

const STORAGE_MESSAGE = "ferreira-dispatch-message";
const STORAGE_GROUPS = "ferreira-dispatch-groups";
const STORAGE_FLYER = "ferreira-dispatch-flyer-url";
const STORAGE_FLYER_B64 = "ferreira-dispatch-flyer-b64";

const MAX_FLYER_WIDTH = 1200;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
const FETCH_TIMEOUT_MS = 8_000;
const RESOLVE_TIMEOUT_MS = 15_000;
const CANVAS_ENCODE_TIMEOUT_MS = 30_000;
const IMAGE_LOAD_TIMEOUT_MS = 12_000;

type DispatchGroup = {
  id: string;
  name: string;
  link: string;
};

type DispatchToast = {
  id: number;
  text: string;
  variant: "flyer" | "text" | "error";
};

type FlyerStatus = "idle" | "loading" | "ready" | "error";

function loadMessage(): string {
  try {
    return localStorage.getItem(STORAGE_MESSAGE) ?? "";
  } catch {
    return "";
  }
}

function loadFlyerUrl(): string {
  try {
    return localStorage.getItem(STORAGE_FLYER) ?? "";
  } catch {
    return "";
  }
}

function loadLegacyFlyerB64(): string {
  try {
    return localStorage.getItem(STORAGE_FLYER_B64) ?? "";
  } catch {
    return "";
  }
}

function loadGroups(): DispatchGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_GROUPS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DispatchGroup[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

function mimeFromUrl(url: string): string | null {
  const lower = url.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

function pngBlobFromDataUrl(dataUrl: string): Blob | null {
  if (!dataUrl.startsWith("data:")) return null;
  try {
    const comma = dataUrl.indexOf(",");
    if (comma === -1) return null;
    const meta = dataUrl.slice(0, comma);
    const body = dataUrl.slice(comma + 1);
    const mime = meta.match(/data:([^;]+)/)?.[1] ?? "image/png";
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime.startsWith("image/") ? mime : "image/png" });
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(blob);
    };
    const timer = setTimeout(() => done(null), CANVAS_ENCODE_TIMEOUT_MS);
    canvas.toBlob((blob) => done(blob), "image/png", 0.92);
  });
}

async function bitmapToPngBlob(
  bitmap: ImageBitmap,
  maxWidth = MAX_FLYER_WIDTH,
): Promise<Blob | null> {
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvasToPngBlob(canvas);
}

async function fileToPngBlob(file: File): Promise<Blob | null> {
  if (!isImageFile(file)) return null;

  if (file.type === "image/png" && file.size <= 4 * 1024 * 1024) {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width <= MAX_FLYER_WIDTH) return file;
        return await bitmapToPngBlob(bitmap);
      } finally {
        bitmap.close();
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const bitmap = await createImageBitmap(file);
    try {
      return await bitmapToPngBlob(bitmap);
    } finally {
      bitmap.close();
    }
  } catch (err) {
    console.warn("[dispatch] createImageBitmap failed — fallback", err);
    const objectUrl = URL.createObjectURL(file);
    try {
      return await imageSourceToPngBlob(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function imageSourceToPngBlob(src: string, maxWidth = MAX_FLYER_WIDTH): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const isLocal = src.startsWith("data:") || src.startsWith("blob:");
    if (!isLocal) img.crossOrigin = "anonymous";

    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(blob);
    };

    const timer = setTimeout(() => finish(null), IMAGE_LOAD_TIMEOUT_MS);

    img.onload = () => {
      try {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvasToPngBlob(canvas).then(finish);
      } catch (err) {
        console.warn("[dispatch] canvas conversion failed", err);
        finish(null);
      }
    };

    img.onerror = () => finish(null);
    img.src = src;
  });
}

async function fetchUrlAsBlob(url: string): Promise<Blob | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { mode: "cors", signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (blob.type.startsWith("image/")) return blob;
    const guessed = mimeFromUrl(url);
    if (guessed) return new Blob([await blob.arrayBuffer()], { type: guessed });
    throw new Error("unknown mime");
  } catch (err) {
    console.warn("[dispatch] url fetch failed", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveFlyerFromUrl(url: string): Promise<Blob | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const fetched = await fetchUrlAsBlob(trimmed);
  if (fetched) {
    const objectUrl = URL.createObjectURL(fetched);
    try {
      return await imageSourceToPngBlob(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  return imageSourceToPngBlob(trimmed);
}

async function copyFlyerOnly(pngBlob: Blob | null): Promise<boolean> {
  if (!pngBlob) return false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngBlob }),
    ]);
    return true;
  } catch (err) {
    console.warn("[dispatch] flyer copy failed", err);
    return false;
  }
}

async function copyTextOnly(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn("[dispatch] text copy failed", err);
    return false;
  }
}

function rotateGroupToEnd(groups: DispatchGroup[], id: string): DispatchGroup[] {
  const idx = groups.findIndex((g) => g.id === id);
  if (idx === -1) return groups;
  const next = [...groups];
  const [item] = next.splice(idx, 1);
  next.push(item);
  return next;
}

export function DispatchPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(() => loadMessage());
  const [flyerUrl, setFlyerUrl] = useState(() => loadFlyerUrl());
  const [debouncedFlyerUrl, setDebouncedFlyerUrl] = useState(() => loadFlyerUrl());
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [flyerStatus, setFlyerStatus] = useState<FlyerStatus>("idle");
  const [flyerPreviewError, setFlyerPreviewError] = useState(false);
  const [groups, setGroups] = useState<DispatchGroup[]>(() => loadGroups());
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [copiedFlyerId, setCopiedFlyerId] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [toast, setToast] = useState<DispatchToast | null>(null);

  const flyerPngRef = useRef<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydrateRunRef = useRef(0);
  const uploadInProgressRef = useRef(false);
  const storageReadyRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  const previewSrc = previewBlobUrl || flyerUrl.trim() || "";

  const revokePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const setPreviewFromBlob = (blob: Blob) => {
    revokePreviewUrl();
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewBlobUrl(url);
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    return () => revokePreviewUrl();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    storageReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!storageReadyRef.current) return;
    try {
      localStorage.setItem(STORAGE_MESSAGE, message);
    } catch {
      /* ignore */
    }
  }, [message]);

  useEffect(() => {
    if (!storageReadyRef.current) return;
    try {
      localStorage.setItem(STORAGE_FLYER, flyerUrl);
    } catch {
      /* ignore */
    }
  }, [flyerUrl]);

  useEffect(() => {
    if (!storageReadyRef.current) return;
    try {
      localStorage.setItem(STORAGE_GROUPS, JSON.stringify(groups));
    } catch {
      /* ignore */
    }
  }, [groups]);

  useEffect(() => {
    setFlyerPreviewError(false);
  }, [previewSrc]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedFlyerUrl(flyerUrl), 600);
    return () => clearTimeout(id);
  }, [flyerUrl]);

  useEffect(() => {
    if (!open || uploadInProgressRef.current) return;

    const runId = ++hydrateRunRef.current;

    const hydrate = async () => {
      try {
        let blob = await loadFlyerPng();

        if (uploadInProgressRef.current || runId !== hydrateRunRef.current) return;

        if (!blob) {
          const legacy = loadLegacyFlyerB64();
          const legacyBlob = legacy ? pngBlobFromDataUrl(legacy) : null;
          if (legacyBlob) {
            await saveFlyerPng(legacyBlob);
            localStorage.removeItem(STORAGE_FLYER_B64);
            blob = legacyBlob;
          }
        }

        if (blob) {
          flyerPngRef.current = blob;
          setPreviewFromBlob(blob);
          setFlyerStatus("ready");
          return;
        }

        const hasUrl = Boolean(debouncedFlyerUrl.trim());
        if (!hasUrl) {
          flyerPngRef.current = null;
          revokePreviewUrl();
          setPreviewBlobUrl(null);
          setFlyerStatus("idle");
          return;
        }

        const png = await withTimeout(
          resolveFlyerFromUrl(debouncedFlyerUrl),
          RESOLVE_TIMEOUT_MS,
        );

        if (uploadInProgressRef.current || runId !== hydrateRunRef.current) return;

        if (png) {
          flyerPngRef.current = png;
          setPreviewFromBlob(png);
          setFlyerStatus("ready");
        } else {
          flyerPngRef.current = null;
          setFlyerStatus("idle");
        }
      } catch (err) {
        console.warn("[dispatch] hydrate failed", err);
        if (runId === hydrateRunRef.current && !uploadInProgressRef.current) {
          setFlyerStatus("idle");
        }
      }
    };

    hydrate();
  }, [open, debouncedFlyerUrl]);

  if (!open) return null;

  const showFlyerToast = (ok: boolean) => {
    setToast({
      id: Date.now(),
      variant: ok ? "flyer" : "error",
      text: ok
        ? "FLYER NA AGULHA // COLE NO GRUPO"
        : "FLYER INDISPONÍVEL // FAÇA UPLOAD PRIMEIRO",
    });
  };

  const showTextToast = (ok: boolean) => {
    setToast({
      id: Date.now(),
      variant: ok ? "text" : "error",
      text: ok
        ? "TEXTO NA AGULHA // COLE A MENSAGEM"
        : "FALHA AO COPIAR TEXTO",
    });
  };

  const showErrorToast = (text: string) => {
    setToast({ id: Date.now(), variant: "error", text });
  };

  const onFlyerUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!isImageFile(file)) {
      setFlyerStatus("error");
      showErrorToast("ARQUIVO INVÁLIDO // USE PNG, JPG OU WEBP");
      return;
    }

    uploadInProgressRef.current = true;
    hydrateRunRef.current++;
    setFlyerStatus("loading");

    try {
      const png = await fileToPngBlob(file);
      if (!png) {
        flyerPngRef.current = null;
        setFlyerStatus("error");
        showErrorToast("FALHA AO PROCESSAR IMAGEM");
        return;
      }

      await saveFlyerPng(png);
      localStorage.removeItem(STORAGE_FLYER_B64);

      flyerPngRef.current = png;
      setPreviewFromBlob(png);
      setFlyerStatus("ready");
    } catch (err) {
      console.warn("[dispatch] upload failed", err);
      flyerPngRef.current = null;
      setFlyerStatus("error");
      showErrorToast("FALHA NO UPLOAD // TENTE UM PNG MENOR");
    } finally {
      uploadInProgressRef.current = false;
    }
  };

  const onClearFlyer = async () => {
    try {
      await clearFlyerPng();
      localStorage.removeItem(STORAGE_FLYER_B64);
    } catch (err) {
      console.warn("[dispatch] clear flyer failed", err);
    }
    flyerPngRef.current = null;
    revokePreviewUrl();
    setPreviewBlobUrl(null);
    setFlyerStatus("idle");
  };

  const onAddGroup = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedLink = link.trim();
    if (!trimmedName || !trimmedLink) return;

    setGroups((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmedName, link: trimmedLink },
    ]);
    setName("");
    setLink("");
  };

  const onCopyFlyer = async (group: DispatchGroup) => {
    const ok = await copyFlyerOnly(flyerPngRef.current);
    showFlyerToast(ok);

    setCopiedFlyerId(group.id);
    setTimeout(() => setCopiedFlyerId(null), 2000);

    if (ok) {
      setGroups((prev) => rotateGroupToEnd(prev, group.id));
    }

    window.open(group.link, "_blank", "noopener,noreferrer");
  };

  const onCopyText = async (group: DispatchGroup) => {
    const ok = await copyTextOnly(message);
    showTextToast(ok);

    setCopiedTextId(group.id);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  const onRemoveGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const hasUploadedFlyer = flyerStatus === "ready" && Boolean(previewBlobUrl);

  const flyerStatusLabel =
    flyerStatus === "ready"
      ? "● FLYER PRONTO NA AGULHA"
      : flyerStatus === "loading"
        ? "◌ PROCESSANDO FLYER..."
        : flyerStatus === "error"
          ? "✕ FLYER INDISPONÍVEL"
          : "// SEM FLYER CONFIGURADO";

  const flyerStatusColor =
    flyerStatus === "ready"
      ? "text-green-400"
      : flyerStatus === "loading"
        ? "text-primary"
        : flyerStatus === "error"
          ? "text-amber-400"
          : "text-white/30";

  const toastIsError = toast?.variant === "error";
  const toastIsFlyer = toast?.variant === "flyer";
  const toastIsText = toast?.variant === "text";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ animation: "fade-up 0.3s ease-out" }}
    >
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {toast && (
        <div
          key={toast.id}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2.5 glass rounded-full px-4 py-2.5 border ${
            toastIsError
              ? "border-amber-400/30 shadow-[0_0_30px_rgba(251,191,36,0.25)]"
              : "border-green-400/30 shadow-[0_0_30px_rgba(34,197,94,0.35)]"
          }`}
          style={{ animation: "fade-up 0.25s ease-out" }}
        >
          {toastIsError ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          ) : toastIsFlyer ? (
            <Image className="h-3.5 w-3.5 text-green-400 shrink-0" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5 text-green-400 shrink-0" />
          )}
          {toastIsText && (
            <CopyCheck className="h-3.5 w-3.5 text-green-400 shrink-0" />
          )}
          <span
            className={`text-[10px] sm:text-xs font-semibold tracking-[0.14em] whitespace-nowrap ${
              toastIsError ? "text-amber-400" : "text-green-400"
            }`}
          >
            {toast.text}
          </span>
        </div>
      )}

      <div className="relative w-full sm:max-w-5xl max-h-[95vh] overflow-y-auto glass rounded-t-2xl sm:rounded-2xl p-5 sm:p-7 shadow-[0_0_60px_rgba(0,149,255,0.15)] border-primary/20">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-white/50 hover:text-white transition z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-8">
          <div>
            <div className="text-[10px] tracking-[0.22em] text-primary">
              PAINEL PRIVADO // DESPACHO
            </div>
            <h3 className="mt-1 text-lg sm:text-xl font-semibold text-white">
              Controle de Grupos WhatsApp
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 rounded-full bg-green-400"
              style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
            />
            <span className="text-[10px] sm:text-xs font-medium tracking-[0.18em] text-green-400">
              ● SISTEMA DE DESPACHO PRONTO
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="flex flex-col gap-5">
            <div className="glass rounded-xl p-4 sm:p-5">
              <label className="block">
                <span className="text-[10px] tracking-[0.18em] text-white/50">
                  MENSAGEM PADRÃO // INFORMATIVO DE OPERAÇÃO
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite a mensagem padrão que será copiada ao abrir cada grupo..."
                  rows={8}
                  className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3.5 py-3 font-mono text-xs sm:text-sm text-white placeholder:text-white/25 outline-none transition focus:border-primary/60 focus:shadow-[0_0_20px_rgba(0,149,255,0.2)]"
                />
              </label>
              <p className="mt-2 text-[10px] tracking-[0.12em] text-white/30 font-mono">
                {message.length} chars // auto-save local
              </p>
            </div>

            <div className="glass rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Image className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] tracking-[0.18em] text-white/50">
                    FLYER DA OPERAÇÃO
                  </span>
                </div>
                <span className={`text-[9px] tracking-[0.14em] font-mono ${flyerStatusColor}`}>
                  {flyerStatusLabel}
                </span>
              </div>
              <p className="mt-1.5 text-[10px] text-white/30">
                Faça upload do flyer (PNG, JPG ou WEBP). Sem upload, apenas o texto
                será copiado no despacho.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
                className="hidden"
                onChange={onFlyerUpload}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={flyerStatus === "loading"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[10px] font-semibold tracking-[0.12em] text-primary transition hover:bg-primary/20 disabled:opacity-40"
                >
                  <Upload className="h-3.5 w-3.5" />
                  UPLOAD DO FLYER
                </button>
                {hasUploadedFlyer && (
                  <button
                    type="button"
                    onClick={onClearFlyer}
                    className="rounded-lg border border-white/10 px-3 py-2 text-[10px] tracking-[0.12em] text-white/40 transition hover:text-red-400 hover:border-red-400/30"
                  >
                    REMOVER UPLOAD
                  </button>
                )}
              </div>

              <label className="block mt-3">
                <span className="text-[10px] tracking-[0.18em] text-white/50">
                  URL DA IMAGEM (OPCIONAL)
                </span>
                <input
                  type="url"
                  value={flyerUrl}
                  onChange={(e) => setFlyerUrl(e.target.value)}
                  placeholder="Ex: https://seu-cdn.com/flyer-operacao.png"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-white/25 outline-none transition focus:border-primary/60 focus:shadow-[0_0_20px_rgba(0,149,255,0.2)]"
                />
              </label>

              {previewSrc && (
                <div className="mt-3">
                  <span className="text-[10px] tracking-[0.18em] text-white/40">
                    PREVIEW
                  </span>
                  <div className="mt-1.5 relative rounded-lg border border-primary/50 shadow-[0_0_20px_rgba(0,149,255,0.25)] overflow-hidden bg-black/40">
                    {flyerPreviewError ? (
                      <div className="flex items-center justify-center gap-2 py-10 font-mono text-[10px] text-white/30">
                        <Image className="h-4 w-4" />
                        // preview indisponível
                      </div>
                    ) : (
                      <img
                        src={previewSrc}
                        alt="Preview do flyer da operação"
                        className="w-full max-h-36 object-contain"
                        onError={() => setFlyerPreviewError(true)}
                        onLoad={() => setFlyerPreviewError(false)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <form onSubmit={onAddGroup} className="glass rounded-xl p-4 sm:p-5 space-y-3">
              <div className="text-[10px] tracking-[0.18em] text-white/50">
                CADASTRAR GRUPO
              </div>

              <Field
                label="Nome do Grupo/Servidor"
                value={name}
                onChange={setName}
                placeholder="Ex: OT Miracle 7.4, Central Global"
              />
              <Field
                label="Link do Grupo do WhatsApp"
                value={link}
                onChange={setLink}
                placeholder="Ex: https://chat.whatsapp.com/..."
              />

              <button
                type="submit"
                className="w-full rounded-lg border border-primary/40 bg-primary/10 py-2.5 text-xs font-semibold tracking-[0.14em] text-primary transition hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(0,149,255,0.25)]"
              >
                + ADICIONAR GRUPO
              </button>
            </form>

            <div className="glass rounded-xl p-4 sm:p-5 flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] tracking-[0.18em] text-white/50">
                    FILA DE DESPACHO
                  </span>
                </div>
                <span className="font-mono text-[10px] text-white/35">
                  {groups.length} total
                </span>
              </div>
              <p className="mb-3 text-[10px] text-white/25 font-mono">
                // 1) copie o flyer e cole no grupo · 2) copie o texto e cole em seguida
              </p>

              {groups.length === 0 ? (
                <p className="text-xs text-white/30 font-mono py-6 text-center">
                  // nenhum grupo cadastrado
                </p>
              ) : (
                <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {groups.map((group, index) => {
                    const isNext = index === 0;
                    return (
                      <li
                        key={group.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                          isNext
                            ? "border border-green-400/30 bg-green-500/5 shadow-[0_0_12px_rgba(34,197,94,0.08)]"
                            : "border border-white/5 bg-black/30"
                        }`}
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span
                            className={`font-mono text-[10px] mt-0.5 shrink-0 ${
                              isNext ? "text-green-400" : "text-white/25"
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-mono text-sm text-white truncate">
                                {group.name}
                              </div>
                              {isNext && (
                                <span className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.14em] bg-green-500/20 text-green-400 border border-green-400/25">
                                  PRÓXIMO
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-white/35 truncate mt-0.5">
                              {group.link}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 sm:ml-0 ml-6">
                          <button
                            type="button"
                            onClick={() => onCopyFlyer(group)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-500/15 border border-green-400/30 px-2.5 py-2 text-[9px] font-semibold tracking-[0.08em] text-green-400 transition hover:bg-green-500/25 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]"
                          >
                            <Image className="h-3 w-3" />
                            {copiedFlyerId === group.id ? "✓ FLYER" : "🖼 FLYER"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopyText(group)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-2.5 py-2 text-[9px] font-semibold tracking-[0.08em] text-primary transition hover:bg-primary/20 hover:shadow-[0_0_16px_rgba(0,149,255,0.25)]"
                          >
                            <MessageSquare className="h-3 w-3" />
                            {copiedTextId === group.id ? "✓ TEXTO" : "📋 TEXTO"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveGroup(group.id)}
                            aria-label={`Remover ${group.name}`}
                            className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.18em] text-white/50">{label}</span>
      <input
        required
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-white/25 outline-none transition focus:border-primary/60 focus:shadow-[0_0_20px_rgba(0,149,255,0.2)]"
      />
    </label>
  );
}
