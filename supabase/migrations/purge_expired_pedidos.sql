-- Purga pedidos Finalizado/Arquivado com mais de 5 dias (updated_at).
-- Opcional: agende com pg_cron no Supabase (Database → Extensions → pg_cron).
--   select cron.schedule(
--     'purge-expired-pedidos',
--     '0 4 * * *',
--     $$ select purge_expired_pedidos_cliente(); $$
--   );

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
