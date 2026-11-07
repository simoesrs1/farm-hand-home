# ValorRural (farm-hand-home)

Marketplace que liga agricultores portugueses a clientes. Os clientes encomendam e levantam na quinta ou recebem em casa; os agricultores gerem produtos, disponibilidade, encomendas e vendas.

## Stack

- React 18, TypeScript, Vite, React Router, TanStack Query
- shadcn/ui, Tailwind CSS, lucide-react
- Supabase (Postgres com RLS, Auth, Realtime, Storage, Edge Functions)

## Desenvolvimento local

```sh
npm install
cp .env.example .env   # preencher com os valores do projeto Supabase
npm run dev            # http://localhost:4200
```

Verificações:

```sh
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm test
```

## Supabase

Projeto: `vwlzarmijxqwmiwtzxlc` (ver `supabase/config.toml`).

```sh
supabase login
supabase link --project-ref vwlzarmijxqwmiwtzxlc

supabase db push                       # aplica as migrações de supabase/migrations/
supabase functions deploy <nome>       # publica uma Edge Function
supabase gen types typescript --linked --schema public > src/integrations/supabase/types.ts
```

- As migrações vivem **apenas** em `supabase/migrations/`.
- Segredos das Edge Functions: `supabase secrets set NOME=valor` (nunca no código nem com prefixo `VITE_`).
- Email (Resend): `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, `EMAIL_FROM` (e `EMAIL_REPLY_TO`, opcional); ver `supabase/functions/_shared/email.ts`. Até o domínio `valorrural.pt` estar verificado no Resend, `EMAIL_FROM` é `ValorRural <onboarding@resend.dev>`.
- Os crons (`expire-orders`, `farmer-activity`) leem `project_url` e `cron_secret` do Vault; ver `supabase/migrations/20261107121000_agendamento_edge_functions.sql`.
