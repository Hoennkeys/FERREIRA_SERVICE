import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { z } from "zod";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  getActiveSession,
  isCurrentUserAdmin,
  signOutAndClearSession,
} from "@/lib/auth";

import {
  DEFAULT_AUTH_REDIRECT,
  sanitizeRedirectPath,
} from "@/lib/safe-redirect";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const NON_ADMIN_MESSAGE = "Esta conta não tem acesso ao painel.";

const loginSearchSchema = z.object({
  redirect: z

    .string()

    .optional()

    .transform((value) => sanitizeRedirectPath(value)),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,

  head: () => ({
    meta: [{ title: "Ferreira na Voz // Login — Linha de Comando Tática" }],
  }),

  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  const { redirect: redirectTo } = Route.useSearch();

  const redirectRef = useRef(redirectTo);

  redirectRef.current = redirectTo;

  const sessionCheckStarted = useRef(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);

  const [envMisconfigured, setEnvMisconfigured] = useState(false);

  useEffect(() => {
    setEnvMisconfigured(!isSupabaseConfigured());

    if (sessionCheckStarted.current) return;

    sessionCheckStarted.current = true;

    let mounted = true;

    (async () => {
      const session = await getActiveSession();

      if (!mounted) return;

      if (!session) {
        setCheckingSession(false);

        return;
      }

      const admin = await isCurrentUserAdmin();

      if (!mounted) return;

      if (admin) {
        navigate({
          to: redirectRef.current ?? DEFAULT_AUTH_REDIRECT,

          replace: true,
        });

        return;
      }

      await signOutAndClearSession();

      if (!mounted) return;

      const remaining = await getActiveSession();

      if (!mounted) return;

      if (!remaining) {
        setError(NON_ADMIN_MESSAGE);

        setCheckingSession(false);
      } else {
        setError("Não foi possível encerrar a sessão. Recarregue a página.");

        setCheckingSession(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    setError(null);

    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),

      password,
    });

    if (signInError) {
      setSubmitting(false);

      setError(
        signInError.message ||
          "Credenciais inválidas. Verifique e-mail e senha.",
      );

      return;
    }

    const admin = await isCurrentUserAdmin();

    if (!admin) {
      await signOutAndClearSession();

      setSubmitting(false);

      setError(NON_ADMIN_MESSAGE);

      return;
    }

    setSubmitting(false);

    navigate({ to: redirectTo ?? DEFAULT_AUTH_REDIRECT, replace: true });
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass rounded-2xl px-8 py-6 text-center">
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,149,255,0.12),transparent_55%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-medium tracking-[0.22em] text-white/40">
            LINHA DE COMANDO TÁTICA
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Autenticação requerida
          </h1>

          <p className="mt-2 text-sm text-white/45">
            Acesso restrito ao painel de dispatch.
          </p>
        </div>

        {envMisconfigured && (
          <p className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            Configure <span className="font-mono">VITE_SUPABASE_URL</span> e{" "}
            <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> no arquivo{" "}
            <span className="font-mono">.env</span> e reinicie o servidor.
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="glass rounded-2xl border border-white/5 p-6 sm:p-8 shadow-[0_0_60px_rgba(0,149,255,0.1)] space-y-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-[10px] font-medium tracking-[0.18em] text-white/50"
            >
              E-MAIL
            </label>

            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operador@ferreiranavoz.com"
              className="h-11 border-white/10 bg-black/40 font-mono text-sm text-white placeholder:text-white/25 focus-visible:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-[10px] font-medium tracking-[0.18em] text-white/50"
            >
              SENHA
            </label>

            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 border-white/10 bg-black/40 font-mono text-sm text-white placeholder:text-white/25 focus-visible:ring-primary/50"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || envMisconfigured}
            className="w-full h-11 text-xs font-semibold tracking-[0.14em]"
          >
            {submitting ? "AUTENTICANDO..." : "ENTRAR NO SISTEMA"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-white/35">
          <Link to="/" className="transition hover:text-white/60">
            ← Voltar para a landing
          </Link>
        </p>
      </div>
    </div>
  );
}
