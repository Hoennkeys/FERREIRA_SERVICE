-- =============================================================
-- SETUP COMPLETO — Ferreira na Voz
-- Cole e execute no SQL Editor do Supabase (uma vez):
--   Dashboard → SQL → New query → Run
-- =============================================================

-- ── 1. Grade de disponibilidade (template semanal) ─────────────

create table if not exists disponibilidade_agenda (
  id            uuid primary key default gen_random_uuid(),
  dia_da_semana text not null,
  hora_inicio   int  not null check (hora_inicio between 7 and 21),
  status        text not null default 'disponivel'
                     check (status in ('disponivel','bloqueado','agendado')),
  unique (dia_da_semana, hora_inicio)
);

do $$
declare
  dias text[] := array[
    'Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'
  ];
  d text;
  h int;
begin
  foreach d in array dias loop
    for h in 7..21 loop
      insert into disponibilidade_agenda (dia_da_semana, hora_inicio, status)
      values (d, h, 'disponivel')
      on conflict (dia_da_semana, hora_inicio) do nothing;
    end loop;
  end loop;
end $$;

alter table disponibilidade_agenda enable row level security;

drop policy if exists "agenda_select_public" on disponibilidade_agenda;
create policy "agenda_select_public"
  on disponibilidade_agenda for select using (true);

-- agenda_update_admin definido após is_admin() (seção 2b)

drop policy if exists "agenda_book_anon" on disponibilidade_agenda;
create policy "agenda_book_anon"
  on disponibilidade_agenda for update
  to anon
  using (status = 'disponivel')
  with check (status = 'agendado');

-- ── 2. Pedidos da homepage + reservas semanais ─────────────────

create table if not exists pedidos_cliente (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  whatsapp        text not null,
  discord         text,
  char_nome       text not null,
  char_level      int  not null check (char_level > 0),
  char_servidor   text not null,
  pacote_id       text not null,
  pacote_nome     text not null,
  pacote_horas    text not null,
  pacote_preco    text not null,
  agenda_dias     text[] not null default '{}',
  agenda_horarios text[] not null default '{}',
  slot_ids        uuid[] not null default '{}',
  semana_inicio   date not null,
  status          text not null default 'Pendente'
                    check (status in ('Pendente','Ativo','Finalizado','Arquivado')),
  origem          text not null default 'homepage',
  claim_token     uuid not null default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists reservas_semana (
  id            uuid primary key default gen_random_uuid(),
  slot_id       uuid not null references disponibilidade_agenda(id) on delete cascade,
  semana_inicio date not null,
  pedido_id     uuid not null references pedidos_cliente(id) on delete cascade,
  status        text not null default 'ativa'
                  check (status in ('ativa','finalizada')),
  unique (slot_id, semana_inicio)
);

create index if not exists idx_reservas_semana_semana on reservas_semana(semana_inicio);
create index if not exists idx_reservas_semana_pedido on reservas_semana(pedido_id);
create index if not exists idx_pedidos_cliente_status on pedidos_cliente(status);

alter table pedidos_cliente enable row level security;
alter table reservas_semana enable row level security;

-- ── 2b. Segurança Fase 1 (admin, RLS, RPCs homepage) ───────────
-- Detalhes: docs/SECURITY.md e migrations/security_phase1_rls.sql

create table if not exists public.admin_allowlist (
  email text primary key
);

alter table public.admin_allowlist enable row level security;

drop policy if exists "admin_allowlist_no_api" on public.admin_allowlist;
create policy "admin_allowlist_no_api"
  on public.admin_allowlist for all using (false) with check (false);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_allowlist
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "agenda_update_admin" on disponibilidade_agenda;
create policy "agenda_update_admin"
  on disponibilidade_agenda for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "pedidos_select_admin"
  on pedidos_cliente for select to authenticated
  using (public.is_admin());

create policy "pedidos_update_admin"
  on pedidos_cliente for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "pedidos_delete_admin"
  on pedidos_cliente for delete to authenticated
  using (public.is_admin());

create or replace function public.pedido_allows_homepage_reserva(p_pedido_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pedidos_cliente
    where id = p_pedido_id and status = 'Pendente' and origem = 'homepage'
  );
$$;

revoke all on function public.pedido_allows_homepage_reserva(uuid) from public;
grant execute on function public.pedido_allows_homepage_reserva(uuid) to anon, authenticated;

create policy "reservas_select_public"
  on reservas_semana for select using (true);

create policy "reservas_insert_homepage"
  on reservas_semana for insert to anon, authenticated
  with check (public.pedido_allows_homepage_reserva(pedido_id));

create policy "reservas_update_admin"
  on reservas_semana for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "reservas_delete_admin"
  on reservas_semana for delete to authenticated
  using (public.is_admin());

-- Rate limit homepage (Fase 2) — ver security_phase2_hardening.sql para RLS sessão/fila
create table if not exists public.homepage_rate_events (
  id uuid primary key default gen_random_uuid(),
  whatsapp_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.homepage_rate_events enable row level security;
drop policy if exists "homepage_rate_events_no_api" on public.homepage_rate_events;
create policy "homepage_rate_events_no_api"
  on public.homepage_rate_events for all using (false) with check (false);

create or replace function public._whatsapp_digits(p_whatsapp text)
returns text language sql immutable as $$
  select nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
$$;

create or replace function public.assert_homepage_pedido_rate(p_whatsapp text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_digits text; v_hash text; v_per_whatsapp_1h int; v_global_1h int; v_pending int;
begin
  v_digits := public._whatsapp_digits(p_whatsapp);
  if v_digits is null or length(v_digits) < 10 then raise exception 'invalid_whatsapp'; end if;
  v_hash := md5(v_digits);
  select count(*)::int into v_per_whatsapp_1h from public.homepage_rate_events
    where whatsapp_hash = v_hash and created_at > now() - interval '1 hour';
  if v_per_whatsapp_1h >= 3 then raise exception 'rate_limit_whatsapp'; end if;
  select count(*)::int into v_global_1h from public.homepage_rate_events
    where created_at > now() - interval '1 hour';
  if v_global_1h >= 40 then raise exception 'rate_limit_global'; end if;
  select count(*)::int into v_pending from public.pedidos_cliente
    where origem = 'homepage' and status = 'Pendente'
      and public._whatsapp_digits(whatsapp) = v_digits;
  if v_pending >= 2 then raise exception 'pending_limit_whatsapp'; end if;
  insert into public.homepage_rate_events (whatsapp_hash) values (v_hash);
end;
$$;
revoke all on function public.assert_homepage_pedido_rate(text) from public;
grant execute on function public.assert_homepage_pedido_rate(text) to anon, authenticated;

create or replace function public.create_pedido_homepage(
  p_nome text, p_whatsapp text, p_discord text, p_char_nome text,
  p_char_level int, p_char_servidor text, p_pacote_id text, p_pacote_nome text,
  p_pacote_horas text, p_pacote_preco text, p_agenda_dias text[],
  p_agenda_horarios text[], p_slot_ids uuid[], p_semana_inicio date
)
returns table (id uuid, claim_token uuid)
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_token uuid;
begin
  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_whatsapp), '') = ''
     or coalesce(trim(p_char_nome), '') = '' or coalesce(trim(p_char_servidor), '') = ''
     or p_char_level is null or p_char_level < 1 then
    raise exception 'invalid_pedido_payload';
  end if;
  perform public.assert_homepage_pedido_rate(p_whatsapp);
  v_token := gen_random_uuid();
  insert into pedidos_cliente (
    nome, whatsapp, discord, char_nome, char_level, char_servidor,
    pacote_id, pacote_nome, pacote_horas, pacote_preco,
    agenda_dias, agenda_horarios, slot_ids, semana_inicio,
    status, origem, claim_token
  ) values (
    trim(p_nome), trim(p_whatsapp), nullif(trim(coalesce(p_discord, '')), ''),
    trim(p_char_nome), p_char_level, trim(p_char_servidor),
    p_pacote_id, p_pacote_nome, p_pacote_horas, p_pacote_preco,
    coalesce(p_agenda_dias, '{}'), coalesce(p_agenda_horarios, '{}'),
    coalesce(p_slot_ids, '{}'), p_semana_inicio,
    'Pendente', 'homepage', v_token
  )
  returning pedidos_cliente.id, pedidos_cliente.claim_token into v_id, v_token;
  return query select v_id, v_token;
end;
$$;

create or replace function public.rollback_pedido_homepage(p_id uuid, p_claim_token uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_deleted int;
begin
  if p_id is null or p_claim_token is null then return false; end if;
  delete from reservas_semana where pedido_id = p_id;
  delete from pedidos_cliente
  where id = p_id and claim_token = p_claim_token
    and origem = 'homepage' and status = 'Pendente';
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.create_pedido_homepage from public;
revoke all on function public.rollback_pedido_homepage from public;
grant execute on function public.create_pedido_homepage to anon, authenticated;
grant execute on function public.rollback_pedido_homepage to anon, authenticated;

create or replace function public.check_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_admin(); $$;
revoke all on function public.check_is_admin() from public;
grant execute on function public.check_is_admin() to authenticated;

insert into public.admin_allowlist (email)
values ('hoennkeys@gmail.com')
on conflict (email) do nothing;

-- ── 3. Limpeza de dados legados ────────────────────────────────

update disponibilidade_agenda
set status = 'disponivel'
where status = 'agendado';

delete from reservas_semana rs
using pedidos_cliente p
where rs.pedido_id = p.id
  and p.status in ('Finalizado', 'Arquivado');

-- ── 4. Realtime (ignora se já estiver habilitado) ──────────────

do $body$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'disponibilidade_agenda'
  ) then
    alter publication supabase_realtime add table disponibilidade_agenda;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pedidos_cliente'
  ) then
    alter publication supabase_realtime add table pedidos_cliente;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reservas_semana'
  ) then
    alter publication supabase_realtime add table reservas_semana;
  end if;
end $body$;

-- ── 5. Retenção: apagar Finalizado/Arquivado após 5 dias ───────

create or replace function purge_expired_pedidos_cliente()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from pedidos_cliente
  where status in ('Finalizado', 'Arquivado')
    and updated_at < now() - interval '5 days';

  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- ── Verificação ────────────────────────────────────────────────
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'disponibilidade_agenda', 'pedidos_cliente', 'reservas_semana', 'admin_allowlist'
  )
order by table_name;
