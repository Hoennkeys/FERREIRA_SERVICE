# Relatório — Segurança Fase 2 (atualizado)

Data: 2026-06-04  
Inclui hardening pós-feedback (sem depender de domínio Cloudflare).

---

## Resumo executivo

| Camada | Proteção |
|--------|----------|
| **Browser** | Headers Vercel + `server.ts`, CSP report-only, redirect seguro |
| **App (Vercel)** | Rate limit server fn, CSRF em server functions, honeypot, Turnstile opcional |
| **Painel** | `requireAdmin` + `check_is_admin` + RLS `is_admin()` |
| **Postgres** | Rate limit na RPC `create_pedido_homepage` (não contorna pelo site) |

---

## O que mudou neste hardening

### Antes (primeira entrega Fase 2)

- Produção **bloqueava pedidos** sem Turnstile (`captcha_not_configured`).
- Spam na RPC ainda possível ignorando o site.
- Qualquer usuário autenticado podia alterar `live_service_session` / `dispatch_queue` (se tabelas existissem).
- Painel só checava “tem sessão”, não allowlist.

### Depois

| Item | Correção |
|------|----------|
| Turnstile ausente | Pedidos **permitidos** com rate limit app (3/30min/IP) + DB (3/h/WhatsApp, 40/h global, máx. 2 pendentes/WhatsApp) |
| RPC spam | `assert_homepage_pedido_rate` dentro de `create_pedido_homepage` |
| Painel | `requireAdmin` + RPC `check_is_admin` |
| Sessão live / fila dispatch | RLS só `is_admin()` (migration) |
| CSRF | `createCsrfMiddleware` em server functions |
| Honeypot | Campo `website` oculto no formulário |
| Testes | `npm run test:security` |

---

## Ação obrigatória no Supabase

Executar no SQL Editor:

[`supabase/migrations/security_phase2_hardening.sql`](../supabase/migrations/security_phase2_hardening.sql)

Sem isso, o rate limit no banco e `check_is_admin` não existem em produção.

---

## Turnstile (opcional)

- **Não** exige “Add site” / nameservers no Cloudflare.
- Menu **Turnstile** → widget → hostnames: `ferreiraservice.vercel.app`, `localhost`.
- Variáveis na Vercel: `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

---

## MFA (manual)

Supabase → Authentication → usuário admin → ativar TOTP.

---

## Limites ainda possíveis (realista)

| Vetor | Mitigação atual | Ideal futuro |
|-------|-----------------|--------------|
| RPC direta com anon key | Limites por WhatsApp + global no DB | Edge Function + IP |
| Rate limit em memória (serverless) | Por instância Vercel | Redis / Upstash |
| PIX no bundle client | Dado público (chave telefone) | Server fn opcional |
| CSP report-only | Não bloqueia XSS ainda | Enforce após validar |

---

## Checklist pós-deploy

- [ ] SQL `security_phase2_hardening.sql` aplicado
- [ ] `npm run test:security` passa no CI/local
- [ ] Smoke: pedido na landing (sem Turnstile)
- [ ] Smoke: login não-admin → volta para `/login`
- [ ] MFA ativado no operador
- [ ] Deploy Vercel com código + `vercel.json`
