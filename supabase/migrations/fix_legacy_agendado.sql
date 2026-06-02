-- One-shot: limpa status legado 'agendado' no template (reservas vivem em reservas_semana)
UPDATE disponibilidade_agenda
SET status = 'disponivel'
WHERE status = 'agendado';

-- Remove reservas órfãs de pedidos já encerrados (opcional, ambiente de teste/produção)
DELETE FROM reservas_semana rs
USING pedidos_cliente p
WHERE rs.pedido_id = p.id
  AND p.status IN ('Finalizado', 'Arquivado');
