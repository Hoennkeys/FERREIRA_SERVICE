-- =============================================================
-- SECURITY PHASE 3 — Monitoramento homepage (admin only)
-- Execute no SQL Editor após security_phase2_hardening.sql
-- =============================================================

create or replace view public.admin_monitoring_homepage_stats
with (security_invoker = true)
as
select
  (select count(*)::int
   from public.pedidos_cliente
   where origem = 'homepage'
     and created_at > now() - interval '1 hour') as pedidos_ultima_hora,
  (select count(*)::int
   from public.homepage_rate_events
   where created_at > now() - interval '1 hour') as rate_events_ultima_hora,
  (select count(*)::int
   from public.pedidos_cliente
   where origem = 'homepage'
     and status = 'Pendente') as pedidos_pendentes_total,
  now() as consultado_em;

revoke all on public.admin_monitoring_homepage_stats from public;
revoke all on public.admin_monitoring_homepage_stats from anon;

-- Acesso somente via RPC com checagem is_admin() (view não exposta à API anon)
create or replace function public.get_admin_monitoring_stats()
returns table (
  pedidos_ultima_hora int,
  rate_events_ultima_hora int,
  pedidos_pendentes_total int,
  consultado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.pedidos_ultima_hora,
    s.rate_events_ultima_hora,
    s.pedidos_pendentes_total,
    s.consultado_em
  from public.admin_monitoring_homepage_stats s
  where public.is_admin();
$$;

revoke all on function public.get_admin_monitoring_stats() from public;
grant execute on function public.get_admin_monitoring_stats() to authenticated;
