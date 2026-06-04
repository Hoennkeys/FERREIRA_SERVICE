import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";

import { isCurrentUserAdmin } from "@/lib/auth";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import { supabase } from "@/lib/supabase";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [adminOk, setAdminOk] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function verify(next: Session | null) {
      if (!next) {
        if (mounted) {
          setSession(null);
          setAdminOk(false);
          setLoading(false);
        }
        return;
      }
      const allowed = await isCurrentUserAdmin();
      if (!mounted) return;
      if (!allowed) {
        await supabase.auth.signOut();
        setSession(null);
        setAdminOk(false);
      } else {
        setSession(next);
        setAdminOk(true);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      void verify(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void verify(nextSession);
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

  if (!session || !adminOk) {
    return (
      <Navigate
        to="/login"
        search={{ redirect: sanitizeRedirectPath(location.pathname) }}
        replace
      />
    );
  }

  return <>{children}</>;
}
