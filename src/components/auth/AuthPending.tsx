export function AuthPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass rounded-2xl px-8 py-6 text-center shadow-[0_0_40px_rgba(0,149,255,0.12)]">
        <div
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          aria-hidden
        />
        <p className="mt-4 text-[10px] font-medium tracking-[0.18em] text-white/50">
          AUTENTICANDO ACESSO
        </p>
      </div>
    </div>
  );
}
