-- Execute no SQL Editor do Supabase (após hunt_analyzer_credits.sql)
alter table public.hunt_sessions add column if not exists xp_gained bigint not null default 0;

-- backfill: estima xp das sessões antigas (exp/h * horas)
update public.hunt_sessions
set xp_gained = round(exp_per_hour * duration_seconds / 3600.0)
where xp_gained = 0 and exp_per_hour > 0;

drop function if exists public.client_hunt_stats(uuid);
create or replace function public.client_hunt_stats(p_client uuid)
returns table (
  hours_today numeric, hours_week numeric, hours_month numeric,
  total_sessions bigint, total_profit bigint, avg_exp_per_hour numeric,
  total_paid numeric,
  total_hours numeric, total_xp bigint, xp_week bigint, xp_month bigint,
  profit_week bigint, profit_month bigint
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
    coalesce(sum(profit_balance) filter (where session_date >= date_trunc('month', now())), 0)::bigint
  from hunt_sessions where client_id = p_client;
$$;
