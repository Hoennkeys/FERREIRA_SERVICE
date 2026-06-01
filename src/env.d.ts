/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_LIVE_SESSION_BACKEND?: "mock" | "supabase";
  readonly VITE_DISPATCH_QUEUE_BACKEND?: "mock" | "supabase";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
