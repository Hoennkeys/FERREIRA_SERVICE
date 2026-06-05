import { redirect } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";

import { sanitizeRedirectPath } from "./safe-redirect";
import { supabase } from "./supabase";

export async function getActiveSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Encerra a sessão Supabase e confirma limpeza local antes de exibir UI pós-logout.
 * Evita race onde getSession() ainda retorna JWT logo após signOut.
 */
export async function signOutAndClearSession(): Promise<void> {
  await supabase.auth.signOut();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await supabase.auth.signOut();
  }
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_is_admin");
  if (error) {
    console.warn("[auth] check_is_admin:", error.message);
    return false;
  }
  return data === true;
}

export async function requireAuth({
  redirectTo,
}: {
  redirectTo: string;
}): Promise<Session> {
  const session = await getActiveSession();
  const safeRedirect = sanitizeRedirectPath(redirectTo);

  if (!session) {
    throw redirect({
      to: "/login",
      search: { redirect: safeRedirect },
    });
  }

  return session;
}

/** Exige sessão + e-mail na admin_allowlist (RLS no Supabase). */
export async function requireAdmin({
  redirectTo,
}: {
  redirectTo: string;
}): Promise<Session> {
  const session = await requireAuth({ redirectTo });
  const safeRedirect = sanitizeRedirectPath(redirectTo);

  const admin = await isCurrentUserAdmin();
  if (!admin) {
    await signOutAndClearSession();
    throw redirect({
      to: "/login",
      search: { redirect: safeRedirect },
    });
  }

  return session;
}
