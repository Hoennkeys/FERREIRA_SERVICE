# Revisão trimestral de segurança — Ferreira na Voz

Template para revisão a cada **3 meses**. Duplicar a seção "Registro" abaixo ou criar issue no GitHub com este checklist.

Referências: [`SECURITY.md`](SECURITY.md), [`MONITORING.md`](MONITORING.md), [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).

---

## Registro

| Campo | Valor |
|-------|--------|
| **Data** | _AAAA-MM-DD_ |
| **Responsável** | _nome_ |
| **Próxima revisão** | _+3 meses_ |
| **Incidentes desde última revisão** | _nenhum / descrever_ |

---

## 1. RLS e migrations

- [ ] Releitura de policies em [`security_phase1_rls.sql`](../supabase/migrations/security_phase1_rls.sql)
- [ ] Releitura de [`security_phase2_hardening.sql`](../supabase/migrations/security_phase2_hardening.sql)
- [ ] Confirmar que [`fix_pedidos_rls_public.sql`](../supabase/migrations/fix_pedidos_rls_public.sql) **nunca** foi aplicado em produção
- [ ] Listar migrations novas desde última revisão e validar RLS em cada uma
- [ ] Se aplicável: [`security_phase3_monitoring.sql`](../supabase/migrations/security_phase3_monitoring.sql) presente em produção

### Smoke tests (Fase 1)

- [ ] Anon: `select * from pedidos_cliente` → negado
- [ ] Landing: criar pedido + rollback com `claim_token` OK
- [ ] Admin: listar, aprovar, arquivar pedidos no `/dispatch`
- [ ] Admin: toggle agenda sem erro de permissão

---

## 2. Admin e autenticação

- [ ] E-mails em `admin_allowlist` corretos e mínimos necessários
- [ ] Sign-up público desabilitado (Supabase Dashboard)
- [ ] MFA TOTP habilitado na conta admin
- [ ] Leaked password protection ativo (Supabase)
- [ ] Rate limit / captcha no login configurado
- [ ] E-mail confirmado em alteração de senha

---

## 3. Dependências e scan

- [ ] `npm run audit:ci` sem high/critical (ou plano de correção documentado)
- [ ] PRs do Dependabot revisados e mergeados
- [ ] Último relatório ZAP (GitHub Actions → `zap-report`) revisado
- [ ] Falsos positivos em [`.zap/rules.tsv`](../.zap/rules.tsv) ainda válidos

---

## 4. Secrets e configuração

- [ ] `.env` fora do git; nenhum `service_role` ou `TWITCH_CLIENT_SECRET` em `VITE_*`
- [ ] Rotacionar chaves se houve exposição ou suspeita
- [ ] Variáveis Vercel alinhadas com [`.env.example`](../.env.example)

Comando de verificação local:

```bash
rg "VITE_.*SECRET|VITE_.*SERVICE_ROLE|service_role" --glob "!node_modules"
```

---

## 5. Monitoramento e privacidade

- [ ] Queries em [`MONITORING.md`](MONITORING.md) executadas; thresholds OK
- [ ] pg_cron (prune + purge) ativo ou limpeza manual documentada
- [ ] Página [`/privacidade`](../src/routes/privacidade.tsx) atualizada se coleta de dados mudou
- [ ] Retenção 5 dias ainda adequada ao negócio

---

## 6. Headers e CSP

- [ ] CSP report-only em [`vercel.json`](../vercel.json) sem violações novas relevantes
- [ ] Third parties mapeados: Supabase, Twitch, Cloudflare Turnstile, `decapi.me`
- [ ] Decisão sobre CSP **enforce** (item futuro em SECURITY.md)

---

## 7. Incidentes e melhorias

- [ ] Incidentes registrados com causa raiz e ações ([`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md))
- [ ] Itens de backlog de segurança priorizados para próximo trimestre

### Notas / achados

```
(escrever aqui)
```

---

## Histórico (opcional)

| Data | Responsável | Resumo |
|------|-------------|--------|
| _—_ | _—_ | Primeira revisão após Fase 3 |
