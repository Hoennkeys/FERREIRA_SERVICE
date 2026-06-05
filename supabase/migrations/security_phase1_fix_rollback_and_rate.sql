-- =============================================================
-- SECURITY FIX — rollback griefing + rate-limit RPC abuse
-- Execute no SQL Editor após security_phase1_rls.sql e security_phase2_hardening.sql
-- =============================================================

-- 1. rollback_pedido_homepage: só apaga reservas se claim_token válido
create or replace function public.rollback_pedido_homepage(
  p_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  if p_id is null or p_claim_token is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.pedidos_cliente
    where id = p_id
      and claim_token = p_claim_token
      and origem = 'homepage'
      and status = 'Pendente'
  ) then
    return false;
  end if;

  delete from public.reservas_semana
  where pedido_id = p_id;

  delete from public.pedidos_cliente
  where id = p_id
    and claim_token = p_claim_token
    and origem = 'homepage'
    and status = 'Pendente';

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.rollback_pedido_homepage from public;
grant execute on function public.rollback_pedido_homepage to anon, authenticated;

-- 2. assert_homepage_pedido_rate: somente uso interno (create_pedido_homepage)
revoke all on function public.assert_homepage_pedido_rate(text) from public;
revoke all on function public.assert_homepage_pedido_rate(text) from anon;
revoke all on function public.assert_homepage_pedido_rate(text) from authenticated;
