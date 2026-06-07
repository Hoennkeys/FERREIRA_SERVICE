import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    url &&
    anonKey &&
    !url.includes("your-project") &&
    !anonKey.includes("your-anon-key"),
  );
}

// Do not throw at import time — the landing page must render even when auth env
// vars are missing on Vercel until they are configured in the dashboard.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
);
