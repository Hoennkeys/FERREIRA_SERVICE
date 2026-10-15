-- ==============================================================================
-- FERREIRA SERVICE: MIGRATION SUPORTE MULTI-SERVIÇOS & COBRANÇA POR TAXA DE HORA
-- Execute este script no SQL Editor do seu Supabase Dashboard.
-- ==============================================================================

-- 1. Adicionar saldo em R$ para os clientes
alter table public.service_clients 
  add column if not exists balance_reais numeric(10,2) not null default 0;

-- 2. Adicionar tipo de serviço e taxa de cobrança nas sessões de serviço
alter table public.hunt_sessions 
  add column if not exists service_type text not null default 'hunt',
  add column if not exists hourly_rate numeric(10,2) not null default 15.00,
  add column if not exists cost_reais numeric(10,2) not null default 0;

-- 3. Atualizar registros existentes
update public.hunt_sessions
set cost_reais = round(((duration_seconds / 3600.0) * coalesce(hourly_rate, 15.00))::numeric, 2)
where cost_reais = 0 and duration_seconds > 0;

update public.service_clients c
set balance_reais = coalesce((
  (select coalesce(sum(amount_paid), 0) from public.client_payments p where p.client_id = c.id)
  -
  (select coalesce(sum(cost_reais), 0) from public.hunt_sessions h where h.client_id = c.id)
), 0);

-- 4. Função e trigger para atualização do balance_reais em pagamentos
create or replace function public.trg_payment_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update service_clients 
    set balance_hours = balance_hours + new.hours_credited,
        balance_reais = balance_reais + new.amount_paid
    where id = new.client_id;
  elsif tg_op = 'DELETE' then
    update service_clients 
    set balance_hours = balance_hours - old.hours_credited,
        balance_reais = balance_reais - old.amount_paid
    where id = old.client_id;
  elsif tg_op = 'UPDATE' then
    update service_clients 
    set balance_hours = balance_hours - old.hours_credited + new.hours_credited,
        balance_reais = balance_reais - old.amount_paid + new.amount_paid
    where id = new.client_id;
  end if;
  return null;
end $$;

-- 5. Função e trigger para dedução do balance_reais ao registrar ou alterar serviços
create or replace function public.trg_hunt_balance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cost numeric(10,2);
  v_old_cost numeric(10,2);
begin
  if tg_op = 'INSERT' then
    v_cost := coalesce(new.cost_reais, round(((new.duration_seconds / 3600.0) * coalesce(new.hourly_rate, 15.00))::numeric, 2));
    update service_clients 
    set balance_hours = balance_hours - (new.duration_seconds / 3600.0),
        balance_reais = balance_reais - v_cost
    where id = new.client_id;
  elsif tg_op = 'DELETE' then
    v_cost := coalesce(old.cost_reais, round(((old.duration_seconds / 3600.0) * coalesce(old.hourly_rate, 15.00))::numeric, 2));
    update service_clients 
    set balance_hours = balance_hours + (old.duration_seconds / 3600.0),
        balance_reais = balance_reais + v_cost
    where id = old.client_id;
  elsif tg_op = 'UPDATE' then
    v_old_cost := coalesce(old.cost_reais, round(((old.duration_seconds / 3600.0) * coalesce(old.hourly_rate, 15.00))::numeric, 2));
    v_cost := coalesce(new.cost_reais, round(((new.duration_seconds / 3600.0) * coalesce(new.hourly_rate, 15.00))::numeric, 2));
    update service_clients 
    set balance_hours = balance_hours + (old.duration_seconds / 3600.0) - (new.duration_seconds / 3600.0),
        balance_reais = balance_reais + v_old_cost - v_cost
    where id = new.client_id;
  end if;
  return null;
end $$;

-- 6. Atualizar a RPC de estatísticas do cliente com total_cost_reais e agregação
drop function if exists public.client_hunt_stats(uuid);
create or replace function public.client_hunt_stats(p_client uuid)
returns table (
  hours_today numeric, hours_week numeric, hours_month numeric,
  total_sessions bigint, total_profit bigint, avg_exp_per_hour numeric,
  total_paid numeric,
  total_hours numeric, total_xp bigint, xp_week bigint, xp_month bigint,
  profit_week bigint, profit_month bigint,
  total_cost_reais numeric
)
language sql stable security invoker set search_path = public as $$
  select
    coalesce(sum(duration_seconds) filter (where session_date >= date_trunc('day', now())), 0) / 3600.0,
    coalesce(sum(duration_seconds) filter (where session_date >= date_trunc('week', now())), 0) / 3600.0,
    coalesce(sum(duration_seconds) filter (where session_date >= date_trunc('month', now())), 0) / 3600.0,
    count(*),
    coalesce(sum(profit_balance), 0)::bigint,
    coalesce(avg(exp_per_hour) filter (where exp_per_hour > 0), 0),
    (select coalesce(sum(amount_paid), 0) from client_payments where client_id = p_client),
    coalesce(sum(duration_seconds), 0) / 3600.0,
    coalesce(sum(xp_gained), 0)::bigint,
    coalesce(sum(xp_gained) filter (where session_date >= date_trunc('week', now())), 0)::bigint,
    coalesce(sum(xp_gained) filter (where session_date >= date_trunc('month', now())), 0)::bigint,
    coalesce(sum(profit_balance) filter (where session_date >= date_trunc('week', now())), 0)::bigint,
    coalesce(sum(profit_balance) filter (where session_date >= date_trunc('month', now())), 0)::bigint,
    coalesce(sum(cost_reais), 0)
  from hunt_sessions where client_id = p_client;
$$;
