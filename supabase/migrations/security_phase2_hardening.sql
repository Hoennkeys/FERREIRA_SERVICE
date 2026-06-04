-- =============================================================
-- SECURITY PHASE 2 — Rate limit RPC, admin check, RLS painel
-- Execute no SQL Editor após security_phase1_*.sql
-- =============================================================

-- ── 1. Eventos de rate limit (sem acesso via API) ─────────────

create table if not exists public.homepage_rate_events (
  id uuid primary key default gen_random_uuid(),
  whatsapp_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists homepage_rate_events_whatsapp_created_idx
  on public.homepage_rate_events (whatsapp_hash, created_at desc);

create index if not exists homepage_rate_events_created_idx
  on public.homepage_rate_events (created_at desc);

alter table public.homepage_rate_events enable row level security;

drop policy if exists "homepage_rate_events_no_api" on public.homepage_rate_events;
create policy "homepage_rate_events_no_api"
  on public.homepage_rate_events
  for all
  using (false)
  with check (false);

-- ── 2. Validação de taxa (security definer) ───────────────────

create or replace function public._whatsapp_digits(p_whatsapp text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
$$;

create or replace function public.assert_homepage_pedido_rate(p_whatsapp text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_hash text;
  v_per_whatsapp_1h int;
  v_global_1h int;
  v_pending int;
begin
  v_digits := public._whatsapp_digits(p_whatsapp);
  if v_digits is null or length(v_digits) < 10 then
    raise exception 'invalid_whatsapp';
  end if;

  v_hash := md5(v_digits);

  select count(*)::int into v_per_whatsapp_1h
  from public.homepage_rate_events
  where whatsapp_hash = v_hash
    and created_at > now() - interval '1 hour';

  if v_per_whatsapp_1h >= 3 then
    raise exception 'rate_limit_whatsapp' using errcode = 'P0001';
  end if;

  select count(*)::int into v_global_1h
  from public.homepage_rate_events
  where created_at > now() - interval '1 hour';

  if v_global_1h >= 40 then
    raise exception 'rate_limit_global' using errcode = 'P0001';
  end if;

  select count(*)::int into v_pending
  from public.pedidos_cliente
  where origem = 'homepage'
    and status = 'Pendente'
    and public._whatsapp_digits(whatsapp) = v_digits;

  if v_pending >= 2 then
    raise exception 'pending_limit_whatsapp' using errcode = 'P0001';
  end if;

  insert into public.homepage_rate_events (whatsapp_hash)
  values (v_hash);
end;
$$;

revoke all on function public.assert_homepage_pedido_rate(text) from public;
grant execute on function public.assert_homepage_pedido_rate(text) to anon, authenticated;

-- Limpeza periódica (opcional manual / cron Supabase)
create or replace function public.prune_homepage_rate_events()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.homepage_rate_events
  where created_at < now() - interval '7 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_homepage_rate_events() from public;

-- ── 3. RPC create_pedido com rate limit ───────────────────────

create or replace function public.create_pedido_homepage(
  p_nome text,
  p_whatsapp text,
  p_discord text,
  p_char_nome text,
  p_char_level int,
  p_char_servidor text,
  p_pacote_id text,
  p_pacote_nome text,
  p_pacote_horas text,
  p_pacote_preco text,
  p_agenda_dias text[],
  p_agenda_horarios text[],
  p_slot_ids uuid[],
  p_semana_inicio date
)
returns table (id uuid, claim_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token uuid;
begin
  if coalesce(trim(p_nome), '') = ''
     or coalesce(trim(p_whatsapp), '') = ''
     or coalesce(trim(p_char_nome), '') = ''
     or coalesce(trim(p_char_servidor), '') = ''
     or p_char_level is null
     or p_char_level < 1 then
    raise exception 'invalid_pedido_payload';
  end if;

  perform public.assert_homepage_pedido_rate(p_whatsapp);

  v_token := gen_random_uuid();

  insert into public.pedidos_cliente (
    nome,
    whatsapp,
    discord,
    char_nome,
    char_level,
    char_servidor,
    pacote_id,
    pacote_nome,
    pacote_horas,
    pacote_preco,
    agenda_dias,
    agenda_horarios,
    slot_ids,
    semana_inicio,
    status,
    origem,
    claim_token
  ) values (
    trim(p_nome),
    trim(p_whatsapp),
    nullif(trim(coalesce(p_discord, '')), ''),
    trim(p_char_nome),
    p_char_level,
    trim(p_char_servidor),
    p_pacote_id,
    p_pacote_nome,
    p_pacote_horas,
    p_pacote_preco,
    coalesce(p_agenda_dias, '{}'),
    coalesce(p_agenda_horarios, '{}'),
    coalesce(p_slot_ids, '{}'),
    p_semana_inicio,
    'Pendente',
    'homepage',
    v_token
  )
  returning pedidos_cliente.id, pedidos_cliente.claim_token
  into v_id, v_token;

  return query select v_id, v_token;
end;
$$;

-- ── 4. check_is_admin para o painel (JWT) ─────────────────────

create or replace function public.check_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

revoke all on function public.check_is_admin() from public;
grant execute on function public.check_is_admin() to authenticated;

-- ── 5. RLS: live_service_session (só admin altera) ────────────

do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'live_service_session'
  ) then
    execute 'alter table public.live_service_session enable row level security';

    execute 'drop policy if exists "authenticated can update session" on public.live_service_session';
    execute 'drop policy if exists "live_session_update_admin" on public.live_service_session';
    execute '
      create policy "live_session_update_admin"
        on public.live_service_session for update
        to authenticated
        using (public.is_admin())
        with check (public.is_admin())';

    execute 'drop policy if exists "anon can read session" on public.live_service_session';
    execute 'drop policy if exists "live_session_select_public" on public.live_service_session';
    execute '
      create policy "live_session_select_public"
        on public.live_service_session for select
        to anon, authenticated
        using (true)';
  end if;
end $$;

-- ── 6. RLS: dispatch_queue (só admin) ─────────────────────────

do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'dispatch_queue'
  ) then
    execute 'alter table public.dispatch_queue enable row level security';

    execute 'drop policy if exists "authenticated can read queue" on public.dispatch_queue';
    execute 'drop policy if exists "authenticated can update queue" on public.dispatch_queue';
    execute 'drop policy if exists "dispatch_queue_admin_all" on public.dispatch_queue';

    execute '
      create policy "dispatch_queue_select_admin"
        on public.dispatch_queue for select
        to authenticated
        using (public.is_admin())';

    execute '
      create policy "dispatch_queue_update_admin"
        on public.dispatch_queue for update
        to authenticated
        using (public.is_admin())
        with check (public.is_admin())';
  end if;
end $$;
