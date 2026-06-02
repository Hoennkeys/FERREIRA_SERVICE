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

drop policy if exists "agenda_update_admin" on disponibilidade_agenda;
create policy "agenda_update_admin"
  on disponibilidade_agenda for update
  using (auth.role() = 'authenticated');

drop policy if exists "agenda_book_anon" on disponibilidade_agenda;
create policy "agenda_book_anon"
  on disponibilidade_agenda for update
  using  (status = 'disponivel')
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

drop policy if exists "pedidos_insert_public" on pedidos_cliente;
create policy "pedidos_insert_public"
  on pedidos_cliente for insert with check (true);

drop policy if exists "pedidos_select_public" on pedidos_cliente;
create policy "pedidos_select_public"
  on pedidos_cliente for select using (true);

drop policy if exists "pedidos_update_admin" on pedidos_cliente;
create policy "pedidos_update_admin"
  on pedidos_cliente for update
  to authenticated using (true) with check (true);

drop policy if exists "pedidos_delete_public" on pedidos_cliente;
create policy "pedidos_delete_public"
  on pedidos_cliente for delete using (true);

drop policy if exists "reservas_select_public" on reservas_semana;
create policy "reservas_select_public"
  on reservas_semana for select using (true);

drop policy if exists "reservas_insert_public" on reservas_semana;
create policy "reservas_insert_public"
  on reservas_semana for insert with check (true);

drop policy if exists "reservas_update_admin" on reservas_semana;
create policy "reservas_update_admin"
  on reservas_semana for update
  to authenticated using (true) with check (true);

drop policy if exists "reservas_delete_public" on reservas_semana;
create policy "reservas_delete_public"
  on reservas_semana for delete using (true);

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
  and table_name in ('disponibilidade_agenda', 'pedidos_cliente', 'reservas_semana')
order by table_name;
