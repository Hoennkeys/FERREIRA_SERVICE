# Twitch — detecção de live na homepage

Passo a passo depois de criar a conta em [dev.twitch.tv](https://dev.twitch.tv).

## 1. Registrar o aplicativo

1. Abra [Console → Applications](https://dev.twitch.tv/console/apps).
2. **Register Your Application**.
3. Preencha:
   - **Name:** `Ferreira Services` (ou qualquer nome)
   - **OAuth Redirect URLs** (adicione as duas):
     - `http://localhost:5173`
     - `https://ferreiraservice.vercel.app`
   - **Category:** escolha a que fizer sentido (ex. Game Integration)
   - **Client type:** **Confidential** (gera Client Secret)
4. Salve o app.

## 2. Copiar credenciais

Na página do aplicativo:

- **Client ID** — copie o valor exibido.
- **Client Secret** — clique em **New Secret** e copie (só aparece uma vez; guarde em local seguro).

## 3. Colocar no projeto (local)

Na raiz do repositório, crie ou edite o arquivo **`.env`** (não vai para o Git):

```env
TWITCH_CLIENT_ID=cole_o_client_id_aqui
TWITCH_CLIENT_SECRET=cole_o_client_secret_aqui
```

Mantenha também suas variáveis Supabase (`VITE_SUPABASE_*`) no mesmo arquivo.

Reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

## 4. Testar localmente

Com a Twitch **ao vivo** no canal `ferreiranavoz`:

```bash
npm run twitch:check
```

Deve mostrar `isLive: true`. Depois abra a homepage e aguarde até ~45s (ou recarregue) — aparece **AO VIVO NA TWITCH** com o player.

## 5. Produção (Vercel)

1. [Vercel](https://vercel.com) → seu projeto → **Settings** → **Environment Variables**.
2. Adicione (Production + Preview):
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
3. **Redeploy** o site (variáveis novas só entram após deploy).

Se usar domínio próprio no site, adicione também:

```env
VITE_TWITCH_PARENT_HOST=www.seudominio.com.br
```

## Problemas comuns

| Sintoma                                        | Solução                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Aviso amarelo “configure TWITCH_CLIENT_ID”     | `.env` local ou Vercel sem as duas variáveis                         |
| `npm run twitch:check` → `missing_credentials` | Arquivo `.env` na raiz ou nomes errados                              |
| `token_failed` / `api_failed`                  | Client Secret errado ou app não “Confidential”                       |
| Live na Twitch mas site offline                | Aguarde o poll (~45s) ou recarregue; confira o canal `ferreiranavoz` |
| Player preto no embed                          | Confira `parent` (localhost / domínio do deploy)                     |

Canal monitorado pela API: **`ferreiranavoz`** (`src/lib/twitch.ts`).
