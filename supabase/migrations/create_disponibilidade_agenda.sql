-- =============================================================
-- DISPONIBILIDADE_AGENDA
-- Execute no SQL Editor do Supabase dashboard:
--   https://supabase.com/dashboard/project/<seu-projeto>/sql
-- =============================================================

create table if not exists disponibilidade_agenda (
  id            uuid primary key default gen_random_uuid(),
  dia_da_semana text not null,
  hora_inicio   int  not null check (hora_inicio between 7 and 21),
  status        text not null default 'disponivel'
                     check (status in ('disponivel','bloqueado','agendado')),
  unique (dia_da_semana, hora_inicio)
);

-- Popula 7 dias × 15 horas = 105 slots (Segunda..Domingo, 07h..21h)
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

-- ── Row Level Security ─────────────────────────────────────────
alter table disponibilidade_agenda enable row level security;

-- Qualquer visitante pode ler a grade
create policy "agenda_select_public"
  on disponibilidade_agenda for select
  using (true);

-- Admin autenticado pode fazer qualquer update (bloqueado ↔ disponivel)
create policy "agenda_update_admin"
  on disponibilidade_agenda for update
  using (auth.role() = 'authenticated');

-- Cliente anônimo pode reservar apenas um slot 'disponivel' → 'agendado'
create policy "agenda_book_anon"
  on disponibilidade_agenda for update
  using  (status = 'disponivel')
  with check (status = 'agendado');

-- ── Realtime ───────────────────────────────────────────────────
-- Habilite a tabela em: Supabase → Database → Replication → Add table
-- Ou execute:
alter publication supabase_realtime add table disponibilidade_agenda;
