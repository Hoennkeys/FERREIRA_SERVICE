import { redirect } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export async function getActiveSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function requireAuth({
  redirectTo,
}: {
  redirectTo: string;
}): Promise<Session> {
  const session = await getActiveSession();

  if (!session) {
    throw redirect({
      to: "/login",
      search: { redirect: redirectTo },
    });
  }

  return session;
}
