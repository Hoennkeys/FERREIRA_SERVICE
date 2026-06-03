-- =============================================================
-- FIX: reservas_insert_homepage falhava porque o WITH CHECK lia
-- pedidos_cliente como anon (sem SELECT permitido).
-- Execute no SQL Editor se security_phase1_rls.sql já foi aplicado.
-- =============================================================

create or replace function public.pedido_allows_homepage_reserva(p_pedido_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pedidos_cliente
    where id = p_pedido_id
      and status = 'Pendente'
      and origem = 'homepage'
  );
$$;

revoke all on function public.pedido_allows_homepage_reserva(uuid) from public;
grant execute on function public.pedido_allows_homepage_reserva(uuid) to anon, authenticated;

drop policy if exists "reservas_insert_homepage" on public.reservas_semana;

create policy "reservas_insert_homepage"
  on public.reservas_semana for insert
  to anon, authenticated
  with check (public.pedido_allows_homepage_reserva(pedido_id));
