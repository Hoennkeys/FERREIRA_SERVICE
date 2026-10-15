-- =============================================================
-- Novo projeto Supabase: GRANTs + tabelas faltantes do painel admin
-- Execute no SQL Editor DEPOIS de supabase/setup.sql (idempotente).
--
-- Sintoma corrigido: "permission denied for table ..." (42501) e
-- 404 em live_service_session / dispatch_queue. Projetos novos não
-- concedem privilégios automáticos às roles anon/authenticated.
-- =============================================================

-- ── Tabelas usadas pelo painel (ver src/lib/*/supabase-store.ts) ──
create table if not exists public.live_service_session (
  id text primary key default 'singleton',
  is_active boolean not null default false,
  is_paused boolean not null default false,
  started_at timestamptz,
  accumulated_seconds integer not null default 0,
  base_xp_hour integer not null default 80000,
  last_session_summary jsonb,
  updated_at timestamptz not null default now()
);
insert into public.live_service_session (id) values ('singleton')
  on conflict (id) do nothing;
alter table public.live_service_session enable row level security;

drop policy if exists "anon can read session" on public.live_service_session;
create policy "anon can read session"
  on public.live_service_session for select
  to anon, authenticated using (true);
drop policy if exists "live_session_update_admin" on public.live_service_session;
create policy "live_session_update_admin"
  on public.live_service_session for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.dispatch_queue (
  id text primary key default 'singleton',
  groups jsonb not null default '[]'::jsonb,
  cooldown jsonb not null default '{"is_active":false,"ends_at":null}'::jsonb,
  cooldown_minutes integer not null default 120,
  updated_at timestamptz not null default now()
);
insert into public.dispatch_queue (id) values ('singleton')
  on conflict (id) do nothing;
alter table public.dispatch_queue enable row level security;

drop policy if exists "dispatch_queue_select_admin" on public.dispatch_queue;
create policy "dispatch_queue_select_admin"
  on public.dispatch_queue for select
  to authenticated using (public.is_admin());
drop policy if exists "dispatch_queue_update_admin" on public.dispatch_queue;
create policy "dispatch_queue_update_admin"
  on public.dispatch_queue for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── GRANTs (RLS continua filtrando linhas) ────────────────────────
grant usage on schema public to anon, authenticated;

grant select, update on public.disponibilidade_agenda to anon, authenticated;
grant select, insert, update, delete on public.reservas_semana to anon, authenticated;
grant select, update, delete on public.pedidos_cliente to authenticated;
grant select on public.live_service_session to anon, authenticated;
grant update on public.live_service_session to authenticated;
grant select, update on public.dispatch_queue to authenticated;
-- admin_allowlist e homepage_rate_events: sem acesso via API (somente funções security definer)

grant execute on function public.check_is_admin() to authenticated;
grant execute on function public.create_pedido_homepage to anon, authenticated;
grant execute on function public.rollback_pedido_homepage to anon, authenticated;
grant execute on function public.pedido_allows_homepage_reserva(uuid) to anon, authenticated;

-- ── Realtime ──────────────────────────────────────────────────────
do $body$
begin
  if not exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'live_service_session') then
    alter publication supabase_realtime add table public.live_service_session;
  end if;
  if not exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'dispatch_queue') then
    alter publication supabase_realtime add table public.dispatch_queue;
  end if;
end $body$;

-- Recarrega o cache do PostgREST
notify pgrst, 'reload schema';
