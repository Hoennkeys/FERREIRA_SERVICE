# Relatório — Fase 3 + Refinamentos de Segurança

**Projeto:** Ferreira na Voz // Services  
**Data:** junho de 2026  
**Escopo:** Implementação completa da Fase 3 (segurança contínua) + quatro refinamentos de alinhamento pós-revisão.

---

## 1. Visão geral da arquitetura de segurança

```mermaid
flowchart TB
  subgraph public [Landing — anon key]
    form[OnboardingModal]
    rpc[RPC create_pedido_homepage]
  end
  subgraph admin [Painel — JWT admin]
    login["/login + is_admin"]
    dispatch["/dispatch RLS"]
  end
  subgraph db [(Supabase Postgres)]
    rls[RLS policies]
    rate[homepage_rate_events]
  end
  subgraph ci [GitHub Actions]
    audit[npm audit]
    zap[OWASP ZAP semanal]
  end
  form --> rpc --> db
  login --> dispatch --> db
  ci --> audit
  ci --> zap
```

| Camada | Mecanismo |
|--------|-----------|
| Dados sensíveis | RLS `is_admin()` em `pedidos_cliente`, `dispatch_queue` |
| Homepage | RPC security definer + `claim_token` + rate limit DB |
| Painel | `requireAdmin`, `ProtectedRoute`, login com gate admin |
| HTTP | HSTS, CSP report-only, headers em `vercel.json` |
| Contínuo | Dependabot, audit CI, ZAP, runbooks, LGPD |

---

## 2. Fase 3 — entregáveis no repositório

### 2.1 Auditoria de dependências

| Artefato | Descrição |
|----------|-----------|
| [`.github/dependabot.yml`](../.github/dependabot.yml) | Updates semanais npm (grupos patch/minor) |
| [`.github/workflows/security.yml`](../.github/workflows/security.yml) | CI: audit, testes, ZAP |
| [`package.json`](../package.json) | Script `npm run audit:ci` |
| [`.zap/rules.tsv`](../.zap/rules.tsv) | Falsos positivos ZAP (HSTS, CSP report-only) |

### 2.2 Monitoramento e incidentes

| Documento | Conteúdo |
|-----------|----------|
| [`docs/MONITORING.md`](MONITORING.md) | Queries SQL, thresholds, Realtime, logging, pg_cron |
| [`docs/INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md) | Contenção (revoke RPC), rotação de keys, comunicação LGPD |
| [`docs/SECURITY_QUARTERLY_REVIEW.md`](SECURITY_QUARTERLY_REVIEW.md) | Checklist trimestral datado |
| [`supabase/migrations/security_phase3_monitoring.sql`](../supabase/migrations/security_phase3_monitoring.sql) | View + RPC `get_admin_monitoring_stats()` |

### 2.3 LGPD / privacidade

| Artefato | Descrição |
|----------|-----------|
| [`src/routes/privacidade.tsx`](../src/routes/privacidade.tsx) | Política operacional (rascunho para revisão jurídica) |
| [`src/components/landing/Footer.tsx`](../src/components/landing/Footer.tsx) | Link "Política de Privacidade" |

### 2.4 Código adicional (Fase 3 original)

| Mudança | Arquivo |
|---------|---------|
| Admin gate no login | `login.tsx` — `isCurrentUserAdmin` antes de redirect |
| Logging sem PII | `safe-log.ts` em `__root.tsx`, `server.ts`, `start.ts` |
| CSP third party | `decapi.me` em `vercel.json` (`use-twitch-status.ts`) |
| Checklist master | [`docs/SECURITY.md`](SECURITY.md) atualizado |

---

## 3. Refinamentos implementados (esta entrega)

### 3.1 Login — anti-loop e limpeza de sessão

**Problema:** `signOut` assíncrono + `useEffect` reexecutável podia deixar JWT residual e causar flicker ou reprocessamento.

**Solução:**

1. Nova função compartilhada [`signOutAndClearSession()`](../src/lib/auth.ts):
   - Chama `signOut()` duas vezes se `getSession()` ainda retornar sessão após a primeira.
2. [`login.tsx`](../src/routes/login.tsx):
   - `useRef(sessionCheckStarted)` — checagem inicial roda **uma vez** (evita Strict Mode / re-mount).
   - `redirectRef` — captura `redirectTo` sem reexecutar effect por mudança de search.
   - Após rejeitar não-admin: confirma `getActiveSession() === null` antes de `setCheckingSession(false)`.
   - Mensagem de fallback se sessão não limpar.
3. [`ProtectedRoute.tsx`](../src/components/auth/ProtectedRoute.tsx) e [`requireAdmin`](../src/lib/auth.ts) — reutilizam o mesmo helper.

### 3.2 safe-log — isomórfico SSR + client

**Problema:** Risco de módulo server-only em boundary React.

**Solução em [`safe-log.ts`](../src/lib/safe-log.ts):**

- Documentação explícita: sem `process.env`, imports `*.server` ou APIs Node.
- Guard `typeof console !== "undefined"` antes de logar.
- Não loga `stack` — só `message`, `name`, `code`.
- `char_nome` adicionado à lista de chaves redacted em `redactForLog`.

### 3.3 Política de privacidade — nicho Tibia / Twitch

**Problema:** Texto genérico não cobria nicks públicos e legítimo interesse do modelo de negócio.

**Solução em [`privacidade.tsx`](../src/routes/privacidade.tsx):**

- Seção 2: distinção nome civil vs nickname; contexto público (jogo + Twitch).
- Seção 4 expandida:
  - Execução de contrato (art. 7º, V) para contato e agenda.
  - Legítimo interesse (art. 7º, IX) para nicks/servidor/level — fila, agenda, anti-conflito.
  - Twitch embed não recebe dados do formulário.
  - Direito de oposição referenciado na seção 8.

### 3.4 GitHub Actions — permissões ZAP

**Problema:** Repos com `GITHUB_TOKEN` restrito podem falhar em upload de artefatos ou criação de issues pelo ZAP.

**Solução em [`security.yml`](../.github/workflows/security.yml):**

```yaml
permissions:
  contents: read

zap-baseline:
  permissions:
    contents: read
    actions: write   # upload-artifact
    issues: write    # ZAP action (alertas futuros)
```

---

## 4. Estado por fase (checklist)

### Fase 1 — Crítico

| Item | Repo | Produção (manual) |
|------|------|-------------------|
| RLS + RPC homepage | ✅ | ⚠️ SQL + sign-up off |
| Admin allowlist | ✅ | ⚠️ Confirmar e-mail |
| Smoke tests | — | ⚠️ Pendente |

### Fase 2 — Importante

| Item | Repo | Produção (manual) |
|------|------|-------------------|
| Headers + CSP report-only | ✅ | ✅ (Vercel) |
| Rate limit + Turnstile | ✅ | ⚠️ Turnstile opcional |
| Login redirect seguro | ✅ | ✅ |
| Server fn + CSRF | ✅ | ✅ |
| MFA admin | — | ⚠️ Dashboard |

### Fase 3 — Contínuo

| Item | Repo | Operação |
|------|------|----------|
| Dependabot + audit CI | ✅ | CI após push |
| MONITORING + INCIDENT | ✅ | Queries manuais |
| `/privacidade` + LGPD nicho | ✅ | Revisão jurídica |
| Revisão trimestral template | ✅ | Primeira entrada pendente |
| ZAP semanal | ✅ | Artefato `zap-report` |
| Monitoring SQL | ✅ | ⚠️ Aplicar migration |
| Refinamentos login/safe-log/ZAP | ✅ | — |

---

## 5. Testes executados

| Comando | Resultado |
|---------|-----------|
| `npm run test:security` | ✅ 3/3 (safe-redirect) |
| `npm run build` | ✅ (rota `/privacidade`, login) |
| `npm run audit:ci` | ⚠️ Falha: `h3` high (transitiva TanStack) — esperado; Dependabot acompanha |

---

## 6. Pendências manuais (operador)

1. **Supabase SQL Editor**
   - `security_phase1_rls.sql` + `security_phase1_fix_reservas_insert.sql` (se ainda não)
   - `security_phase2_hardening.sql`
   - `security_phase3_monitoring.sql`

2. **Supabase Dashboard**
   - Sign-up público desabilitado
   - MFA TOTP no admin
   - Leaked password protection
   - Rate limit / captcha no login

3. **GitHub**
   - Push para ativar workflows
   - `workflow_dispatch` no Security para testar ZAP
   - Revisar artefato `zap-report` semanalmente

4. **Governança**
   - Preencher primeira [`SECURITY_QUARTERLY_REVIEW.md`](SECURITY_QUARTERLY_REVIEW.md)
   - Revisão jurídica da política em `/privacidade`

5. **Secrets**
   ```bash
   rg "VITE_.*SECRET|VITE_.*SERVICE_ROLE|service_role" --glob "!node_modules"
   ```

---

## 7. Arquivos alterados nesta sessão de refinamentos

| Arquivo | Mudança |
|---------|---------|
| `src/lib/auth.ts` | `signOutAndClearSession()` |
| `src/routes/login.tsx` | Anti-loop, confirmação pós-logout |
| `src/components/auth/ProtectedRoute.tsx` | Usa helper de logout |
| `src/lib/safe-log.ts` | Isomórfico + `char_nome` redacted |
| `src/routes/privacidade.tsx` | Nicks, Twitch, legítimo interesse |
| `.github/workflows/security.yml` | Permissões explícitas |
| `docs/SECURITY_PHASE3_REFINEMENTS_REPORT.md` | Este relatório |

---

## 8. Referências cruzadas

- Checklist vivo: [`SECURITY.md`](SECURITY.md)
- Fase 2: [`SECURITY_PHASE2_REPORT.md`](SECURITY_PHASE2_REPORT.md)
- Monitoramento: [`MONITORING.md`](MONITORING.md)
- Incidentes: [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md)
- Revisão trimestral: [`SECURITY_QUARTERLY_REVIEW.md`](SECURITY_QUARTERLY_REVIEW.md)
- Bootstrap DB: [`supabase/setup.sql`](../supabase/setup.sql)
- Env template: [`.env.example`](../.env.example)
