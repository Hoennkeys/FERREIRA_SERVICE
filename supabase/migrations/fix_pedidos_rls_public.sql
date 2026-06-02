-- =============================================================
-- FIX: homepage anônima precisa SELECT (RETURNING id) e DELETE
-- (rollback) em pedidos_cliente.
-- Execute no SQL Editor se create_pedidos_cliente.sql já foi aplicado.
-- =============================================================

drop policy if exists "pedidos_select_public" on pedidos_cliente;
create policy "pedidos_select_public"
  on pedidos_cliente for select
  using (true);

drop policy if exists "pedidos_delete_public" on pedidos_cliente;
create policy "pedidos_delete_public"
  on pedidos_cliente for delete
  using (true);
