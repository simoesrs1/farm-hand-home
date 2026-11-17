# Plano: Unificar a entrega ao domicílio e deixar o cliente escolher no carrinho

- **Data:** 2026-11-17
- **Pedido original:** O envio é feito pelo próprio agricultor, mas `delivery_mode` (pickup/shipping/both) e `local_delivery` representam o mesmo conceito em duplicado. Pretende-se:
  - uma fonte única por produto (levantamento, entrega pelo agricultor ou ambos);
  - o cliente escolhe no carrinho entre levantar e receber em casa, com uma preferência opcional vinda da página do artigo;
  - horário de entrega validado contra `delivery_hours` e o de levantamento contra `pickup_hours`, no carrinho e no `create-order`;
  - validação do raio de entrega;
  - migração dos produtos existentes;
  - formulário de produto com um só controlo;
  - compatibilidade com o planeamento de rotas.
- **Profundidade da pesquisa:** normal (2 subagentes: código e documentação Postgres/Supabase)

## 1. Contexto

Um produto pode dizer "Levantamento ou entrega em casa" na página do artigo (`delivery_mode = both`), mas o checkout só reconhece a entrega quando `local_delivery = true`. O resultado é que o cliente é obrigado a agendar um levantamento. Foi o caso dos 3 produtos da "Quinta dos Testes" (`both` + `local_delivery = false`).

Além disso, mesmo com `local_delivery = true`:
- o horário pedido é o de porta aberta (`pickup_hours`), e o horário de entregas configurado em Disponibilidade nunca é usado;
- o raio de entrega não é validado em lado nenhum.

O objetivo é ter um único conceito de entrega por produto e uma escolha clara para o cliente, validada no servidor, que alimente o planeamento de rotas já implementado.

**Decisões do Ruben:**
- **Carrinho misto:** só se oferecem as opções comuns a todos os produtos. Se não houver nenhuma, pede-se para separar a encomenda.
- **Agendamento da entrega:** dentro de `delivery_hours`, mas só a partir de N dias depois da compra (prazo mínimo de preparação).
- **Raio:** validado no carrinho e no servidor.

## 2. Âmbito

**Inclui:**
- **Fonte única:** `products.delivery_mode` passa a significar levantamento / entrega pelo agricultor / ambos. O `local_delivery` fica sincronizado por trigger durante a transição e é removido numa migração posterior.
- **Escolha do cliente no carrinho:** seletor "Levantar na quinta / Receber em casa", com horários próprios para cada caso, morada e ponto só na entrega, e taxa só na entrega.
- **Preferência na página do artigo:** escolher o modo (quando é `both`) e o horário no respetivo horário, guardado em `scopedStorage`.
- **`create-order`:**
  - recebe `fulfillment` (`pickup` | `delivery`);
  - valida que todos os produtos a permitem;
  - valida as janelas certas, o prazo mínimo e o raio;
  - calcula a taxa só na entrega;
  - adapta as notificações ("entrega" vs "levantamento").
- **Formulários de produto (novo e editar):** um só controlo de 3 opções. Tracking, preço e prazo mínimo só aparecem quando há entrega. Aviso quando o agricultor não tem entregas configuradas em Disponibilidade.
- **Textos nas listagens** (`ProductCard`, página do artigo, filtros da categoria).
- **FarmerOrders:** "é entrega" passa a ser `delivery_address != null`. As paragens da rota passam a usar `expected_delivery_at` quando não há hora marcada.
- **Testes:** `fulfillment`, `pickup-hours` (prazo mínimo) e `delivery-fee`.

**Fica de fora:**
- **Envio por transportadora:** não existe. `shipping` passa a ser "entregue pelo agricultor".
- **Mudar o nome do valor do enum de `shipping` para `delivery`:** opcional, num ciclo futuro (ver riscos).
- **Uma coluna `fulfillment` em `orders`:** `delivery_address IS NOT NULL` já é o critério usado em MyOrders, avaliações e expire-orders.
- **`OrderStatus.tsx`**, que hoje trata tudo como levantamento. Fica registado como seguimento.
- **Fase 2 da rota (OpenRouteService)**, que continua no plano próprio.

## 3. Conclusões da pesquisa

### No código
- **Modelo atual:**
  - enum `delivery_mode` e `products.delivery_mode` NOT NULL DEFAULT 'pickup' (`supabase/migrations/20260702183346_…sql:3-8`);
  - `products.local_delivery` (`20260908180308_…sql:1-12`);
  - `delivery_tracking` (`20261105130000_order_delivery_tracking.sql`);
  - `delivery_fee` e os `default_*` em `farmer_details`, mais o RPC `apply_delivery_defaults` (`20261105140000_delivery_fee_and_defaults.sql:19-148`). O RPC aceita `delivery_mode`, `local_delivery`, `delivery_tracking`, `shipping_days`, `delivery_fee` e `free_delivery_threshold`, e põe o tracking a false onde `NOT local_delivery`.
- **Vista `public_farmer_profiles`** (`20261105140000_…sql:53-83`): já expõe `pickup_lat/lng`, `pickup_hours`, `delivery_radius_km`, `delivery_hours`, `delivery_note` e `free_delivery_threshold`. **Não referencia `local_delivery`**, por isso nenhuma das migrações a altera.
- **Histórico:** o trigger `log_product_history` é genérico (`to_jsonb`) e não precisa de alterações.
- **`create-order`** (`supabase/functions/create-order/index.ts`):
  - lê `local_delivery`, mas não lê `delivery_mode` (`:126`);
  - valida o agendamento sempre contra `pickup_hours` (`:195-210`);
  - `needsDelivery` = algum produto com `local_delivery` (`:216-219`);
  - **não valida o raio nem `delivery_hours`**;
  - `parsePickupWindows` e `isWithinWindows` são locais ao ficheiro (`:30-80`);
  - as notificações falam sempre de "levantamento" (`:348-371`).
- **`Cart.tsx`:**
  - decide a entrega por `local_delivery` (`:66-93`, `:218-251`);
  - só lê `pickup_hours` (`:138-162`);
  - o agendamento é sempre de levantamento (`:480-514`);
  - o mapa usa `DeliveryPointPicker`;
  - o aviso de segurança e o "perderá 100%" assumem levantamento (`:574-616`).
- **`src/lib/pickup-hours.ts`:** `pickupSlots(windows, { days, stepMinutes, from })` (`:98-120`), sem prazo mínimo. Não há teste.
- **`src/lib/delivery-fee.ts`:** `computeDeliveryFee` filtra por `local_delivery`. Tem teste em `src/test/delivery-fee.test.ts`.
- **`src/lib/geo.ts`:** `distanceKm` e `formatKm` servem para o raio no cliente.
- **`ProductDetail.tsx`:**
  - o rótulo vem de `delivery_mode` (`:242-247`) e o bloco "entrega pelo agricultor" vem de `local_delivery` (`:351-389`);
  - o seletor de horário só usa `pickup_hours` (`:185-202`, `:475-522`);
  - guarda `STORAGE_KEYS.pickupSlot` (`:233`), cuja chave está em `src/lib/consent.ts:164-167`.
- **Listagens:** filtros "levantamento/entrega" em `CategoryPage.tsx:64-65,276-281` e rótulo em `ProductCard.tsx:79-86`. Ambos já usam `delivery_mode`.
- **Formulários:**
  - `EditProduct.tsx:50-54` (`DELIVERY_OPTIONS`: "Envio… por transportadora") e `:495-592`;
  - `NewProduct.tsx:549-662`;
  - ambos têm o switch "Entrego eu ao domicílio", `DeliveryFeeFields` e "Dias de envio";
  - `delivery-defaults.ts` (`hasHomeDelivery`, `normalizeDeliverySettings`);
  - `DeliveryScopeDialog`.
- **Disponibilidade** (`Availability.tsx:280-480`): raio, horários e nota de entrega. Um produto pode hoje ter entrega com o agricultor sem raio configurado.
- **"É entrega" nas encomendas:** o critério fiável é `orders.delivery_address IS NOT NULL`, já usado em:
  - `MyOrders.tsx:97`;
  - `review-eligibility.ts`;
  - `order_review_context`;
  - `expire-orders/index.ts:52`.

  `FarmerOrders.isHomeDelivery` usa ainda `local_delivery` através de `deliveryProductNames` (`:168-173`, `:236-243`).
- **Rota:** `useDeliveryRoute.ts` não lê campos de produto. As paragens vêm de `delivery_lat/lng` com `when = scheduled_pickup_at ?? pickup_deadline` (`FarmerOrders.tsx:245-261`).
- **Forma de tratamento:**
  - Cart e ProductDetail usam "você", com alguns "tu" soltos (`Cart.tsx:225,264-265,311`; `ProductDetail.tsx:535`);
  - os formulários do agricultor usam "você";
  - FarmerOrders usa "tu".

### Na documentação externa
- **Postgres não permite remover valores de um enum.** `RENAME VALUE` existe desde a versão 10, mas parte de imediato quem envie o valor antigo. `ADD VALUE` não pode ser usado na mesma transação ([ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html)). Por isso **mantém-se o enum e os valores atuais**.
- **Uma coluna gerada não pode ser escrita.** O frontend antigo que grava `local_delivery` falharia ([Generated Columns](https://www.postgresql.org/docs/current/ddl-generated-columns.html)). Para a transição usa-se um **trigger BEFORE INSERT OR UPDATE** ([CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html), [Supabase Triggers](https://supabase.com/docs/guides/database/postgres/triggers)).
- **Padrão expand → migrate → contract** ([Fowler, Parallel Change](https://martinfowler.com/bliki/ParallelChange.html), [Prisma Data Guide](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern)): primeiro acrescentar e sincronizar, depois mudar os clientes, e só no fim remover, num deploy separado.
- **Vistas:**
  - `CREATE OR REPLACE VIEW` só pode acrescentar colunas no fim; para remover é preciso `DROP` e voltar a criar, com os `GRANT` repetidos ([CREATE VIEW](https://www.postgresql.org/docs/current/sql-createview.html)). Aqui não se aplica, porque a vista não usa `local_delivery`.
  - As vistas ignoram RLS por omissão ([Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)). A vista atual já é `security_invoker = off` de forma intencional e não muda.
- **Migrações:** são aplicadas por ordem de timestamp pelo `db push` ([Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations)). Os tipos regeneram-se com `supabase gen types typescript` ([Generating types](https://supabase.com/docs/guides/api/rest/generating-types)).

### Por confirmar
- **Flag exata de `supabase gen types`** na versão do CLI do projeto (`--project-id` ou `--linked`). Alternativa: atualizar `types.ts` à mão, só nas colunas afetadas, como já foi feito noutras migrações.
- **Produtos reais** com `delivery_mode` `shipping` ou `both` cujo agricultor **não** tem raio configurado. Depois da migração anunciam entrega, mas o carrinho não a oferece. Confirmar com uma query só de leitura antes de aplicar e avisar esses agricultores. É provável que sejam só os de teste.
- **Duplicar a lógica de janelas e raio no Deno ou partilhá-la:** as Edge Functions não importam `src/`. Proposta: `supabase/functions/_shared/fulfillment.ts` com as funções do servidor, e uma versão espelho em `src/lib/` com testes. Confirmar se aceitas esta duplicação controlada.

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | Manter o enum `delivery_mode` (pickup/shipping/both) como fonte única; `shipping` passa a significar "entrega pelo agricultor"; `local_delivery` sincronizado por trigger e removido mais tarde | Sem mudança de tipo nem de vistas; o frontend antigo continua a funcionar durante o deploy; migração pequena | O nome `shipping` no código não corresponde ao texto mostrado |
| B | Trocar para dois booleanos (`allows_pickup`, `allows_delivery`) | Semântica mais clara e evolutiva | Obriga a mudar todos os sítios que leem `delivery_mode` (listagens, filtros, RPC, seed) e a uma transição mais longa |
| C | Manter os dois campos e só corrigir o checkout | Menos trabalho imediato | Mantém a duplicação que causou o problema; contraria o CLAUDE.md |

**Recomendação:** **opção A**, com expand → migrate → contract:
- uma migração que alinha os dados e instala o trigger;
- o código novo passa a ler e escrever só `delivery_mode`;
- dias depois, uma migração que remove `local_delivery` e `default_local_delivery`.

É a forma mais curta de chegar a uma fonte única sem partir o site durante o deploy. Mudar o nome do valor `shipping` fica opcional para depois.

## 5. Passos de implementação

1. **Fase 1: migração "expand"** (`supabase/migrations/20261118120000_entrega_fonte_unica.sql`)
   - Alinhar os dados:
     - `UPDATE products SET delivery_mode = 'both' WHERE local_delivery AND delivery_mode = 'pickup'`;
     - depois, `local_delivery = delivery_mode IN ('shipping','both')`;
     - `delivery_tracking = false` onde o modo é `pickup`.
     - O mesmo em `farmer_details` (`default_delivery_mode`, `default_local_delivery`, `default_delivery_tracking`).
   - Trigger `BEFORE INSERT OR UPDATE` em `products` e `farmer_details`:
     - se só `local_delivery` mudou, deriva o modo (`true`: pickup → both; `false`: shipping ou both → pickup);
     - senão, `local_delivery := modo IN ('shipping','both')`.
     - Função com `SET search_path = ''` e nomes qualificados.
   - `CREATE OR REPLACE FUNCTION apply_delivery_defaults`, com a mesma assinatura:
     - ignora `local_delivery` se vier `delivery_mode`, e caso contrário converte-o;
     - põe o tracking a false onde o modo é `pickup`;
     - mantém o `GRANT EXECUTE` a `authenticated`.
   - Sem alterações de RLS e sem colunas novas, por isso sem `GRANT` novos.
   - Atualizar `src/integrations/supabase/types.ts` se o RPC ou os tipos mudarem. Não se espera mudança de tipos nesta fase.
2. **Fase 2: lógica partilhada e testes**
   - `src/lib/fulfillment.ts` (novo):
     - `fulfillmentOptions(modes[])`: interseção, que devolve `['pickup','delivery']`, só um, ou nenhum;
     - `allowsDelivery(mode)`;
     - `minDeliveryDate(products, now)`: maior `shipping_days`;
     - `isWithinDeliveryRadius(farm, point, radiusKm)`, com `distanceKm`.
   - `src/lib/pickup-hours.ts`: `pickupSlots` aceita `earliest?: Date` (os slots começam a partir daí e os `days` contam a partir de `earliest`).
   - `src/lib/delivery-fee.ts`: `computeDeliveryFee` passa a receber só os produtos da encomenda de entrega (`{delivery_fee}[]`), sem `local_delivery`.
   - `src/lib/delivery-defaults.ts`:
     - retirar `local_delivery` de `DeliverySettings`;
     - `hasHomeDelivery = mode !== 'pickup'`;
     - a normalização põe o tracking a false se o modo for `pickup`;
     - etiqueta "Prazo mínimo de preparação" no lugar de "Dias de envio".
   - Testes:
     - `src/test/fulfillment.test.ts` (novo);
     - `src/test/pickup-hours.test.ts` (novo, com `earliest`);
     - atualizar `src/test/delivery-fee.test.ts`.
   - `supabase/functions/_shared/fulfillment.ts` (novo): interseção dos modos, haversine e prazo mínimo para o Deno. Mover para aqui o `parsePickupWindows`/`isWithinWindows` do `create-order`.
3. **Fase 3: `create-order`**
   - Ler `delivery_mode` e `shipping_days` dos produtos, e `pickup_lat/lng`, `delivery_radius_km` e `delivery_hours` do agricultor.
   - Body: novo campo `fulfillment` (`pickup` | `delivery`).
     - Se faltar (frontend antigo durante o deploy), deduzir como hoje: entrega se vier `delivery_address`, senão levantamento.
     - Rejeitar se não estiver na interseção.
   - Levantamento: janelas de `pickup_hours`, como hoje. Ignorar morada, ponto e taxa.
   - Entrega:
     - exige morada e ponto;
     - o agricultor tem de ter raio e `pickup_lat/lng`;
     - distância ≤ raio;
     - horário dentro de `delivery_hours` e ≥ agora + max(`shipping_days`). Se não houver `delivery_hours`, não há agendamento e `expected_delivery_at` = agora + N dias;
     - taxa = maior `delivery_fee`, menos o limite de entrega grátis;
     - tracking só se algum produto o oferecer.
   - Mensagens de erro e notificações conforme o modo ("entrega" / "levantamento").
   - Manter o nome da coluna `scheduled_pickup_at` (usada pela rota e por FarmerOrders) para os dois modos.
4. **Fase 4: carrinho e página do artigo**
   - `Cart.tsx`:
     - ler `delivery_mode`, `shipping_days`, `delivery_fee` e `delivery_tracking`, e da vista `pickup_lat/lng`, `delivery_radius_km`, `delivery_hours` e `delivery_note`;
     - estado `fulfillment`, com o valor inicial vindo da preferência guardada ou da única opção disponível;
     - seletor só quando há as duas opções;
     - sem opção comum, mensagem a pedir para separar a encomenda, ao estilo da de "vários agricultores";
     - bloco de horário com título, horários e prazo conforme o modo;
     - morada, ponto e tracking só na entrega;
     - aviso imediato se o ponto ficar fora do raio;
     - resumo com "Entrega ao domicílio" ou "Levantamento";
     - avisos de segurança e "perderá 100%" só no levantamento;
     - `fulfillment` no body;
     - uniformizar os "tu" soltos para "você".
   - `ProductDetail.tsx`:
     - rótulo e bloco de entrega a partir de `delivery_mode` (sem `local_delivery`);
     - com `both`, escolha "Levantar / Receber em casa" e slots do horário correspondente (com prazo mínimo na entrega);
     - guardar `STORAGE_KEYS.fulfillment` (nova chave em `consent.ts`) e o slot;
     - corrigir "Já tens" para "Já tem".
   - `ProductCard.tsx` e filtros de `CategoryPage.tsx`: textos "Entrega ao domicílio pelo agricultor" e "Levantamento ou entrega ao domicílio", sem "(N dias)" (deixa de ser prazo de envio).
5. **Fase 5: formulários do agricultor e encomendas**
   - `NewProduct.tsx` e `EditProduct.tsx`:
     - um só controlo de 3 opções: "Levantamento na quinta", "Entrega ao domicílio (feita por si)" e "Ambos, à escolha do cliente";
     - remover o switch "Entrego eu ao domicílio";
     - tracking, `DeliveryFeeFields` e "Prazo mínimo de preparação (dias)" só com entrega;
     - aviso com ligação para Disponibilidade se o agricultor não tiver raio ou horários de entrega;
     - `DeliveryScopeDialog` e `ProductHistoryDialog` com os rótulos atualizados.
   - `FarmerOrders.tsx`:
     - `isHomeDelivery = !isBooking(o) && o.delivery_address != null`;
     - remover a consulta `deliveryProductNames`;
     - selecionar `expected_delivery_at` e usar `when = scheduled_pickup_at ?? expected_delivery_at ?? pickup_deadline` nas paragens.
     - `useDeliveryRoute` não muda.
   - Seed `supabase/exemplos/produtos-exemplo.sql`: sem alterações; o trigger acerta o `local_delivery`.
6. **Fase 6: migração "contract"** (num commit e deploy separados, dias depois)
   - `DROP TRIGGER` e as funções de sincronização.
   - `ALTER TABLE products DROP COLUMN local_delivery`, `farmer_details DROP COLUMN default_local_delivery`.
   - `apply_delivery_defaults` sem o ramo `local_delivery`.
   - Atualizar `types.ts`.
   - Garantir antes, com um grep, que nada lê `local_delivery`.

## 6. Ficheiros e estimativa

| Ficheiro | Ação | Motivo |
|---|---|---|
| `supabase/migrations/20261118120000_entrega_fonte_unica.sql` | criar | Alinhar dados, trigger de sincronização, RPC |
| `supabase/migrations/2026112xxxxxxx_remover_local_delivery.sql` | criar (fase 6) | Remover as colunas duplicadas |
| `supabase/functions/_shared/fulfillment.ts` | criar | Janelas, raio, prazo e interseção no servidor |
| `supabase/functions/create-order/index.ts` | alterar | `fulfillment`, validações, taxa, notificações |
| `src/lib/fulfillment.ts` | criar | Mesma lógica no cliente |
| `src/lib/pickup-hours.ts` | alterar | `earliest` em `pickupSlots` |
| `src/lib/delivery-fee.ts`, `src/lib/delivery-defaults.ts` | alterar | Sem `local_delivery` |
| `src/lib/consent.ts` | alterar | `STORAGE_KEYS.fulfillment` |
| `src/test/fulfillment.test.ts`, `src/test/pickup-hours.test.ts` | criar | Testes |
| `src/test/delivery-fee.test.ts` | alterar | Nova interface |
| `src/pages/Cart.tsx` | alterar | Escolha, horários, raio, textos |
| `src/pages/ProductDetail.tsx` | alterar | Preferência, rótulos, slots por modo |
| `src/components/ProductCard.tsx`, `src/pages/CategoryPage.tsx` | alterar | Textos e filtros |
| `src/pages/farmer/NewProduct.tsx`, `src/pages/farmer/EditProduct.tsx` | alterar | Um só controlo, prazo mínimo, aviso |
| `src/components/DeliveryScopeDialog.tsx`, `src/components/ProductHistoryDialog.tsx` | alterar | Rótulos |
| `src/pages/farmer/FarmerOrders.tsx` | alterar | `isHomeDelivery`, `expected_delivery_at` na rota |
| `src/integrations/supabase/types.ts` | alterar | Só se o RPC mudar; fase 6 remove colunas |

| Fase | Esforço |
|---|---|
| Fase 1: migração expand | S–M (≈ 2–3 h, com teste local do trigger) |
| Fase 2: lógica e testes | M (≈ 3 h) |
| Fase 3: `create-order` | M (≈ 3 h) |
| Fase 4: carrinho e artigo | M–L (≈ 4–5 h) |
| Fase 5: formulários e encomendas | M (≈ 3 h) |
| Fase 6: contract (mais tarde) | S (≈ 1 h) |
| Verificação no browser | ≈ 1–2 h |
| **Total** | **≈ 17–20 h (2 a 2,5 dias)** |

## 7. Riscos e questões em aberto

- **Segurança / RLS:**
  - as validações (modo, raio, janelas e prazo) passam a ser feitas no `create-order`, e o cliente só antecipa avisos;
  - o trigger não muda permissões;
  - a função usa `search_path` fixo.
- **Privacidade e consentimento:** sem dados novos. A morada e o ponto já eram pedidos. A preferência guardada usa `scopedStorage`, que respeita o consentimento "preferences".
- **Custos:** zero.
- **Compatibilidade durante o deploy:**
  - o trigger mantém `local_delivery` coerente para o frontend antigo;
  - o `create-order` aceita o body antigo, sem `fulfillment`;
  - a migração e as Edge Functions publicam-se pelo workflow e o frontend pela Cloudflare. A ordem segura é migração, depois Edge Function, depois frontend, e isso acontece naturalmente num push.
- **Dados:**
  - produtos que hoje dizem "envio" sem o agricultor ter raio configurado deixam de poder ser entregues até ele configurar Disponibilidade;
  - as encomendas antigas não mudam, porque o critério "é entrega" continua a ser `delivery_address`.
- **Semântica do `shipping_days`:** passa de "dias de envio" a "prazo mínimo de preparação". Nos produtos existentes mantém-se o número, mas o significado muda ligeiramente.
- **Fuso horário:** o cliente calcula os slots na hora local do browser e o servidor valida em Europe/Lisbon, tal como hoje. Pode haver discrepância para clientes fora de Portugal (já existia).
- **Decisões pendentes:**
  1. Confirmar a duplicação controlada da lógica entre `src/lib/fulfillment.ts` e `supabase/functions/_shared/fulfillment.ts`.
  2. O prazo mínimo é por produto (`shipping_days`, e o carrinho usa o maior) ou passa a ser um valor único do agricultor em Disponibilidade? Proposta: **por produto**, como está.
  3. O seletor "Levantar / Receber em casa" na página do artigo aparece sempre que o produto é `both`, ou só quando o agricultor tem entregas configuradas? Proposta: **só quando há entregas configuradas**.
  4. Mudar o nome de `shipping` para `delivery` no enum: fazer num ciclo futuro ou nunca?
- **Ordem em relação à rota:** fazer este plano **antes** da fase 2 da rota (OpenRouteService). É ele que garante que as encomendas de entrega têm ponto, horário e raio válidos.

## 8. Fontes

- **Ficheiros consultados:**
  - `supabase/functions/create-order/index.ts`
  - `src/pages/Cart.tsx`
  - `src/pages/ProductDetail.tsx`
  - `src/pages/farmer/NewProduct.tsx`
  - `src/pages/farmer/EditProduct.tsx`
  - `src/pages/farmer/Availability.tsx`
  - `src/pages/farmer/FarmerOrders.tsx`
  - `src/pages/CategoryPage.tsx`
  - `src/components/ProductCard.tsx`
  - `src/components/DeliveryScopeDialog.tsx`
  - `src/components/ProductHistoryDialog.tsx`
  - `src/lib/delivery-defaults.ts`
  - `src/lib/delivery-fee.ts`
  - `src/lib/pickup-hours.ts`
  - `src/lib/consent.ts`
  - `src/lib/geo.ts`
  - `src/hooks/useDeliveryRoute.ts`
  - `src/pages/MyOrders.tsx`
  - `src/lib/review-eligibility.ts`
  - `supabase/functions/expire-orders/index.ts`
  - `supabase/migrations/20260702183346_…`, `20260908180308_…`, `20261105130000_order_delivery_tracking.sql`, `20261105140000_delivery_fee_and_defaults.sql`, `20261003120000_product_history.sql`
  - `supabase/exemplos/produtos-exemplo.sql`
  - `src/integrations/supabase/types.ts`
- **Ligações:**
  - https://www.postgresql.org/docs/current/sql-altertype.html
  - https://www.postgresql.org/docs/current/datatype-enum.html
  - https://www.postgresql.org/docs/current/ddl-generated-columns.html
  - https://www.postgresql.org/docs/current/sql-createtrigger.html
  - https://www.postgresql.org/docs/current/sql-createview.html
  - https://supabase.com/docs/guides/database/postgres/triggers
  - https://supabase.com/docs/guides/database/postgres/row-level-security
  - https://supabase.com/docs/guides/deployment/database-migrations
  - https://supabase.com/docs/guides/api/rest/generating-types
  - https://martinfowler.com/bliki/ParallelChange.html
  - https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern
