# FarmConnect (farm-hand-home): instruções para o Claude

Marketplace que liga agricultores portugueses a clientes. Os clientes encomendam e levantam na quinta ou recebem em casa; os agricultores gerem produtos, disponibilidade, encomendas e vendas.

## Comunicação

- Trata o utilizador sempre pelo primeiro nome: **Ruben**.
- **Antes de alterar qualquer ficheiro, pede aprovação.** Primeiro apresenta o plano: que ficheiros vais criar, alterar ou apagar, e porquê. Depois espera pela confirmação do Ruben. Isto aplica-se a todas as alterações, incluindo correções pequenas. Ler ficheiros, pesquisar e correr verificações (`tsc`, `lint`, testes) não precisa de aprovação.
- Se durante o trabalho o plano tiver de mudar (outro ficheiro, outra abordagem), para e volta a pedir aprovação.
- Responde em português de Portugal (pt-PT), sem brasileirismos (ecrã, utilizador, ficheiro, guardar, telemóvel).
- Sê direto. Diz o que mudou, o que foi verificado e o que ficou por verificar. Se algo não foi testado no browser, diz isso.
- Quando encontrares um erro fora do que foi pedido, corrige-o se for pequeno e seguro, e menciona-o no resumo.

## Stack

- React 18, TypeScript e Vite; React Router; TanStack Query.
- UI: shadcn/ui (`@/components/ui/*`), Tailwind CSS, ícones `lucide-react`.
- Backend: Supabase (Postgres com RLS, Auth, Realtime, Edge Functions em Deno). Cliente em `@/integrations/supabase/client`.
- Projeto gerido também pelo Lovable (`.lovable/`).
- Testes: Vitest (`src/test/`).

## Comandos

```bash
npm run dev                         # servidor de desenvolvimento
npx tsc --noEmit -p tsconfig.app.json   # verificação de tipos
npm run lint                        # ESLint
npm test                            # Vitest
```

Depois de alterar código, corre sempre `tsc` e `eslint` sobre os ficheiros alterados antes de dizer que está feito. Erros que já existiam antes da tua alteração reportam-se, não se escondem.

## Estrutura

- `src/pages/`: páginas públicas e de cliente; `src/pages/farmer/`: área do agricultor (rotas `/agricultor/...`).
- `src/components/`: componentes partilhados (diálogos, mapas, cartões).
- `src/contexts/`: Auth, Cart, Stock, Consent.
- `src/lib/`: lógica pura e reutilizável (horários, atividade, consentimento, textos legais).
- `src/integrations/supabase/types.ts`: tipos gerados da base de dados.
- `supabase/functions/`: Edge Functions; código partilhado em `supabase/functions/_shared/`.
- `supabase/migrations/`: migrações SQL, com o nome `AAAAMMDDHHMMSS_descricao.sql`.
- `docs/`: documentação de funcionalidades (ex.: `sistema-atividade-agricultores.md`).

## Normas de programação

### Geral
- Escreve código parecido com o que está à volta: mesma densidade de comentários, nomes e padrões.
- Comentários em português. Nomes de variáveis, funções e componentes em inglês (`homeDeliveryOrders`, `FarmerOrders`).
- Todo o texto visível na interface em pt-PT. Mantém a forma de tratamento que a página já usa ("tu" ou "você"), sem misturar as duas na mesma página.
- Reutiliza componentes e utilitários existentes antes de criar novos (ex.: `DeliveryRouteMapDialog`, `ScheduleEditor`, `@/lib/pickup-hours`).

### Uma única fonte para cada dado
- Cada configuração ou formulário vive num só sítio. Não dupliques formulários entre páginas.
  - A configuração de entregas ao domicílio (raio, horários, nota) está **apenas** em Disponibilidade (`/agricultor/disponibilidade`).
  - O acompanhamento das entregas ao domicílio (mapa do percurso e lista) está no diálogo "Entregas ao domicílio" em Encomendas (`/agricultor/encomendas`).
- Para mostrar dados noutra página, usa um botão que abre um diálogo, em vez de criar uma página nova.

### React
- Hooks (`useState`, `useMemo`, `useEffect`) sempre antes de qualquer `return` antecipado.
- Dados derivados que passam a componentes de mapa ou com efeitos pesados devem ser memorizados com `useMemo`, para não voltar a desenhar o mapa a cada render.
- Não condiciones a visibilidade de botões principais a dados que podem estar vazios sem motivo. Se não houver dados, o componente mostra um estado vazio com uma mensagem.
- Notificações ao utilizador com `toast` (`@/hooks/use-toast`); estados de carregamento com `Loader2` ou `Skeleton`.
- Usa os tokens de cor do tema (`bg-card`, `text-primary`, `text-muted-foreground`, `border-border`) e nunca cores fixas no JSX, exceto nos marcadores do Google Maps.

### Rotas
- Ao remover uma página, mantém a rota antiga com `<Navigate replace />` para o destino novo. Atenção: `/agricultor/:id` apanha qualquer rota `/agricultor/...` que não exista.
- Remove também a ligação no `Header.tsx` (desktop e menu móvel).

### Supabase
- Antes de usar uma coluna numa query, confirma que existe em `src/integrations/supabase/types.ts` ou nas migrações. Uma coluna inexistente faz a query inteira falhar sem dar erro visível (ex.: `farmer_details` tem `company_name`, não `farm_name`).
- Evita `as any`. Quando os tipos estão desatualizados, diz isso ao Ruben em vez de os contornar em silêncio.
- Alterações ao esquema: nova migração em `supabase/migrations/` com RLS e `GRANT` explícitos.
- Operações sensíveis (pagamentos, mudanças de estado de encomendas) passam por Edge Functions (`order-action`, `create-order`, `validate-pickup`), nunca por `update` direto no cliente.

### Mapas e privacidade
- Tudo o que carrega o Google Maps fica dentro de `MapConsentGate` e respeita `useConsent().hasConsent("maps")`.
- A chave do Maps vem de `import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY`.

## Segurança e Git

- **Nunca** fazer commit de `.env` nem de outros ficheiros com segredos. Novas variáveis vão para o `.env.example`, com o valor vazio.
- Segredos de servidor (service role, chaves de pagamento) só nas Edge Functions, via `Deno.env`, e nunca com prefixo `VITE_`.
- Só fazer commit ou push quando o Ruben pedir. Nada de force push, reescrita de histórico ou `--no-verify` sem autorização explícita.
- Mensagens de commit em português, curtas e descritivas.
