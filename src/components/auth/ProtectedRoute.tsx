import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass rounded-2xl px-8 py-6 text-center shadow-[0_0_40px_rgba(0,149,255,0.12)]">
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
            aria-hidden
          />
          <p className="mt-4 text-[10px] font-medium tracking-[0.18em] text-white/50">
            VERIFICANDO SESSÃO
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        search={{ redirect: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}
