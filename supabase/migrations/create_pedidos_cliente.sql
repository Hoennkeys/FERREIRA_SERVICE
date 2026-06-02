-- =============================================================
-- PEDIDOS_CLIENTE + RESERVAS_SEMANA
-- Execute no SQL Editor do Supabase dashboard.
-- =============================================================

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

-- ── Row Level Security ─────────────────────────────────────────
alter table pedidos_cliente enable row level security;
alter table reservas_semana enable row level security;

-- Pedidos: homepage pode inserir; admin autenticado lê e atualiza
create policy "pedidos_insert_public"
  on pedidos_cliente for insert
  with check (true);

create policy "pedidos_select_admin"
  on pedidos_cliente for select
  to authenticated
  using (true);

create policy "pedidos_update_admin"
  on pedidos_cliente for update
  to authenticated
  using (true)
  with check (true);

create policy "pedidos_delete_admin"
  on pedidos_cliente for delete
  to authenticated
  using (true);

-- Reservas: qualquer um lê (grade pública); anon insere; admin atualiza
create policy "reservas_select_public"
  on reservas_semana for select
  using (true);

create policy "reservas_insert_public"
  on reservas_semana for insert
  with check (true);

create policy "reservas_update_admin"
  on reservas_semana for update
  to authenticated
  using (true)
  with check (true);

create policy "reservas_delete_public"
  on reservas_semana for delete
  using (true);

-- ── Realtime ───────────────────────────────────────────────────
alter publication supabase_realtime add table pedidos_cliente;
