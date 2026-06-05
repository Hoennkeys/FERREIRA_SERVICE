# Plano de resposta a incidentes — Ferreira na Voz

Runbook operacional para abuso, vazamento ou comprometimento. Complementa [`SECURITY.md`](SECURITY.md) e [`MONITORING.md`](MONITORING.md).

---

## 1. Detecção

Sinais de alerta:

| Sinal                                 | Fonte                                          |
| ------------------------------------- | ---------------------------------------------- |
| Pico de pedidos homepage (>20/h)      | [`MONITORING.md`](MONITORING.md) — queries SQL |
| Muitos `rate_limit_*` nos logs        | Supabase Logs → API / Postgres                 |
| ZAP baseline com alerta High/Critical | GitHub Actions → artefato `zap-report`         |
| Acesso não autorizado ao painel       | Relato do operador ou sessão estranha          |
| Chave anon/service exposta no git     | `grep` em histórico ou alerta Dependabot       |

**Severidade**

- **P1 (crítico):** vazamento de `service_role`, acesso admin não autorizado, dump de `pedidos_cliente`
- **P2 (alto):** spam massivo bloqueando operação, anon key exposta
- **P3 (médio):** picos contidos pelo rate limit, ZAP medium sem exploit

---

## 2. Contenção imediata (primeiros 15 min)

### 2.1 Suspender criação de pedidos pela homepage

No **SQL Editor** do Supabase (produção):

```sql
revoke execute on function public.create_pedido_homepage from anon;
revoke execute on function public.rollback_pedido_homepage from anon;
```

Para reativar após contenção:

```sql
grant execute on function public.create_pedido_homepage to anon, authenticated;
grant execute on function public.rollback_pedido_homepage to anon, authenticated;
```

### 2.2 Rotacionar chaves

1. **Supabase Dashboard → Project Settings → API**
   - Rotacionar **anon key** (se exposta ou suspeita)
   - Rotacionar **service_role** apenas se comprometida (nunca vai para o client)
2. Atualizar `.env` / variáveis Vercel: `VITE_SUPABASE_ANON_KEY`
3. Redeploy na Vercel

### 2.3 Auth

- **Authentication → Providers → Email:** confirmar sign-up público **desabilitado**
- Se conta admin comprometida: reset de senha + revisar `admin_allowlist`
- Habilitar MFA no operador (ver checklist em [`SECURITY.md`](SECURITY.md))

### 2.4 Twitch / Turnstile (se aplicável)

- Rotacionar `TWITCH_CLIENT_SECRET` e `TURNSTILE_SECRET_KEY` se vazados
- Atualizar secrets na Vercel (sem prefixo `VITE_`)

---

## 3. Investigação

### 3.1 Supabase

```sql
-- Pedidos última hora (homepage)
select count(*), date_trunc('minute', created_at) as bucket
from pedidos_cliente
where origem = 'homepage' and created_at > now() - interval '24 hours'
group by 2 order by 2 desc;

-- Eventos de rate limit
select count(*), date_trunc('hour', created_at) as hour
from homepage_rate_events
where created_at > now() - interval '24 hours'
group by 2 order by 2 desc;

-- Allowlist atual
select * from admin_allowlist;
```

- **Logs → API:** erros `rate_limit_whatsapp`, `rate_limit_global`, `invalid_pedido_payload`
- **Logs → Auth:** tentativas de login falhas

### 3.2 Aplicação

- Vercel → Deployments → Runtime Logs (filtrar `rate_limit`, `[clients]`, `[auth]`)
- GitHub Actions → último ZAP + `npm audit`

### 3.3 Não logar em produção

Senhas, tokens completos, WhatsApp, Discord ou nome de clientes em `console.error`. Ver [`src/lib/safe-log.ts`](../src/lib/safe-log.ts).

---

## 4. Recuperação

1. Re-grant RPCs anon (se revogados)
2. Smoke tests da Fase 1 em [`SECURITY.md`](SECURITY.md):
   - Anon não lê `pedidos_cliente`
   - Landing cria pedido + rollback funciona
   - Painel admin lista e aprova pedidos
3. Confirmar RLS: **não** executar [`fix_pedidos_rls_public.sql`](../supabase/migrations/fix_pedidos_rls_public.sql)
4. Registrar incidente na próxima [`SECURITY_QUARTERLY_REVIEW.md`](SECURITY_QUARTERLY_REVIEW.md)

---

## 5. Comunicação (se vazamento de dados pessoais)

Template (adaptar):

> Olá, identificamos um incidente de segurança em [data] que pode ter afetado dados informados no formulário de contratação (nome, WhatsApp e/ou Discord). Tomamos medidas para bloquear o acesso indevido e estamos investigando. Você pode solicitar exclusão dos seus dados pelo WhatsApp [número público do site]. Pedimos desculpas pelo transtorno.

- Registrar data, escopo estimado e ações na revisão trimestral
- Se escala LGPD: consultar assessoria jurídica

---

## 6. Pós-incidente

- [ ] Causa raiz documentada
- [ ] Chaves rotacionadas (se necessário)
- [ ] Policies RLS revalidadas
- [ ] Thresholds de monitoramento ajustados em [`MONITORING.md`](MONITORING.md)
- [ ] Entrada em [`SECURITY_QUARTERLY_REVIEW.md`](SECURITY_QUARTERLY_REVIEW.md)
- [ ] Itens de hardening adicionados ao backlog (ex.: CSP enforce, Edge rate limit por IP)

---

## Contatos rápidos

| Recurso             | Onde                                                |
| ------------------- | --------------------------------------------------- |
| Supabase projeto    | [Dashboard](https://supabase.com/dashboard)         |
| Vercel deploy       | [Dashboard Vercel](https://vercel.com)              |
| Relatório ZAP       | GitHub → Actions → Security → artefato `zap-report` |
| Checklist segurança | [`SECURITY.md`](SECURITY.md)                        |
