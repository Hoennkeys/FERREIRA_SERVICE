-- =============================================================
-- HUNT ANALYZER & GESTÃO DE CRÉDITOS
-- Execute no SQL Editor do Supabase. Requer public.is_admin()
-- (security_phase1_rls.sql).
-- =============================================================

create table if not exists public.service_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_number text not null default '',
  balance_hours numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.service_clients(id) on delete cascade,
  amount_paid numeric(10,2) not null check (amount_paid >= 0),
  hours_credited numeric(10,4) not null check (hours_credited > 0),
  proof_image_url text,
  date timestamptz not null default now()
);

create table if not exists public.hunt_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.service_clients(id) on delete cascade,
  session_date timestamptz not null default now(),
  duration_seconds integer not null check (duration_seconds > 0),
  exp_per_hour bigint not null default 0,
  loot_value bigint not null default 0,
  supplies_cost bigint not null default 0,
  profit_balance bigint not null default 0,
  stopwatch_image_url text,
  loot_image_url text,
  notes text
);

create index if not exists idx_payments_client_date on public.client_payments (client_id, date desc);
create index if not exists idx_hunts_client_date on public.hunt_sessions (client_id, session_date desc);

-- ── Triggers: saldo dinâmico ────────────────────────────────────
create or replace function public.trg_payment_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update service_clients set balance_hours = balance_hours + new.hours_credited where id = new.client_id;
  elsif tg_op = 'DELETE' then
    update service_clients set balance_hours = balance_hours - old.hours_credited where id = old.client_id;
  elsif tg_op = 'UPDATE' then
    update service_clients set balance_hours = balance_hours - old.hours_credited where id = old.client_id;
    update service_clients set balance_hours = balance_hours + new.hours_credited where id = new.client_id;
  end if;
  return null;
end $$;

create or replace function public.trg_hunt_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update service_clients set balance_hours = balance_hours - new.duration_seconds / 3600.0 where id = new.client_id;
  elsif tg_op = 'DELETE' then
    update service_clients set balance_hours = balance_hours + old.duration_seconds / 3600.0 where id = old.client_id;
  elsif tg_op = 'UPDATE' then
    update service_clients set balance_hours = balance_hours + old.duration_seconds / 3600.0 where id = old.client_id;
    update service_clients set balance_hours = balance_hours - new.duration_seconds / 3600.0 where id = new.client_id;
  end if;
  return null;
end $$;

drop trigger if exists payment_balance on public.client_payments;
create trigger payment_balance after insert or update or delete on public.client_payments
  for each row execute function public.trg_payment_balance();

drop trigger if exists hunt_balance on public.hunt_sessions;
create trigger hunt_balance after insert or update or delete on public.hunt_sessions
  for each row execute function public.trg_hunt_balance();

-- ── RLS: somente admin ──────────────────────────────────────────
alter table public.service_clients enable row level security;
alter table public.client_payments enable row level security;
alter table public.hunt_sessions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['service_clients','client_payments','hunt_sessions'] loop
    execute format('drop policy if exists "%1$s_admin_all" on public.%1$s', t);
    execute format('create policy "%1$s_admin_all" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ── Agregações por cliente ──────────────────────────────────────
create or replace function public.client_hunt_stats(p_client uuid)
returns table (
  hours_today numeric, hours_week numeric, hours_month numeric,
  total_sessions bigint, total_profit bigint, avg_exp_per_hour numeric,
  total_paid numeric
)
language sql stable security invoker set search_path = public as $$
  select
    coalesce(sum(duration_seconds) filter (where session_date >= date_trunc('day', now())), 0) / 3600.0,
    coalesce(sum(duration_seconds) filter (where session_date >= date_trunc('week', now())), 0) / 3600.0,
    coalesce(sum(duration_seconds) filter (where session_date >= date_trunc('month', now())), 0) / 3600.0,
    count(*),
    coalesce(sum(profit_balance), 0)::bigint,
    coalesce(avg(exp_per_hour) filter (where exp_per_hour > 0), 0),
    (select coalesce(sum(amount_paid), 0) from client_payments where client_id = p_client)
  from hunt_sessions where client_id = p_client;
$$;

-- ── Storage privado para prints ─────────────────────────────────
insert into storage.buckets (id, name, public) values ('hunt-proofs', 'hunt-proofs', false)
on conflict (id) do nothing;

drop policy if exists "hunt_proofs_admin_all" on storage.objects;
create policy "hunt_proofs_admin_all" on storage.objects for all to authenticated
  using (bucket_id = 'hunt-proofs' and public.is_admin())
  with check (bucket_id = 'hunt-proofs' and public.is_admin());
