# Plano: subscrições dos agricultores (cabazes com entrega em casa)

- **Data:** 2026-11-21
- **Pedido original:** botão de subscrição na quinta com um balão com vários planos; o agricultor define preço, periodicidade da cobrança, o que oferece, descrição, frequência e distância de entrega numa aba própria; pode ter vários planos; multa e indemnização se não entregar o que promete.
- **Profundidade da pesquisa:** normal (código + Stripe e direito do consumidor)
- **Respostas do Ruben:** cobrança simulada agora, Stripe depois; queixa do cliente + decisão da equipa; só entrega em casa; botão na página da quinta.
- **Estado:** implementado (falta testar no browser e aplicar a migração com o push).

## 1. Contexto

Os agricultores querem vender cabazes recorrentes. O cliente subscreve um plano e recebe entregas regulares em casa; o agricultor é penalizado se falhar uma entrega prometida.

## 2. Âmbito

**Inclui:** planos por agricultor, subscrever com morada e ponto no mapa, cobrança simulada por período, entregas como encomendas, cancelamento pelo cliente e pelo agricultor, multa e indemnização na queixa aceite, Termos e Política de Privacidade, 5 idiomas.

**Fica de fora:** cobrança real (Stripe Billing), pausar ou saltar uma entrega, escolher o dia da semana da entrega, área de administração para decidir queixas.

## 3. Conclusões da pesquisa

### No código
- As reservas já são encomendas com `orders.kind`; as entregas de subscrição são `kind = 'subscription'` e ganham de graça o chat, o código QR (`validate-pickup`), o mapa de entregas (`FarmerOrders` → `delivery-route`) e as queixas (`file_delivery_complaint`, `on_delivery_complaint_decision`).
- `orders.farmer_amount` tem `CHECK (farmer_amount >= 0)`: a multa e a indemnização ficam em colunas próprias (`farmer_fine`, `client_compensation`).
- Agendamento com `pg_cron` (como `expire-stock-batches`).
- Oferta nova `offers_subscriptions` em `farmer_details`, com o menu filtrado por `useFarmerOfferings`.

### Na documentação externa
- Stripe: para reter o dinheiro até à entrega, usar subscrições na plataforma com transferências separadas (`source_transaction`) depois de cada entrega: [Connect subscriptions](https://docs.stripe.com/connect/subscriptions), [separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers.md).
- Cobrança automática só com cartão ou SEPA; MB WAY e Multibanco em subscrições só em modo fatura (pagamento manual): [Multibanco](https://docs.stripe.com/changelog/acacia/2024-09-30/billing-mutlibanco-support), [MB WAY](https://docs.stripe.com/changelog/dahlia/2026-07-29/hosted-invoice-page-mb-way-support). Billing custa 0,7%: [preços](https://stripe.com/pt/billing/pricing).
- Multa ao agricultor: descontar nas transferências seguintes (as reversões de transferência não servem para multas): [account debits](https://docs.stripe.com/connect/account-debits).
- DL 24/2014: informação pré-contratual (preço por período, periodicidade, cancelamento) e botão "com obrigação de pagar" (art. 5.º); retratação de 14 dias conta a partir da primeira entrega: [pgdlisboa](https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=2062&tabela=leis).
- Cláusula penal entre empresas: proporcional ao dano (DL 446/85, art. 19.º, al. c)): [DRE](https://diariodarepublica.pt/dr/detalhe/decreto-lei/446-1985-177869).

### Por confirmar
- Se a exceção de perecíveis (art. 17.º, n.º 1, al. d) do DL 24/2014) afasta a retratação de 14 dias numa subscrição de cabazes. A implementação deixa cancelar a qualquer momento, o que cobre o caso.
- Transposição portuguesa do "botão de retratação" (Diretiva 2023/2673).
- Valores da multa (10%) e da indemnização (20%): escolhidos como ponto de partida, a validar pelo Ruben e por um jurista.

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | Entregas como encomendas (`kind = 'subscription'`) | Reutiliza chat, QR, mapa, queixas, vendas | Uma linha em `orders` por entrega |
| B | Tabela própria de entregas | Modelo mais "limpo" | Duplicar chat, QR, queixas e mapa |

**Recomendação (implementada):** opção A.

## 5. Passos de implementação (feitos)

1. Migração `supabase/migrations/20261121150000_subscricoes.sql`: `offers_subscriptions`, `subscription_plans`, `subscriptions`, `orders.kind = 'subscription'`, `subscription_id`, `farmer_fine`, `client_compensation`; funções `subscribe_to_plan`, `cancel_subscription`, `bill_subscription_period`, `run_subscription_billing` (pg_cron, de hora a hora); queixa aceite com multa e indemnização; `complete_farmer_onboarding` com a opção de subscrições; tradução automática dos planos.
2. Agricultor: aba `/agricultor/subscricoes` (`MySubscriptions.tsx`) com planos, editor num balão e clientes subscritores; menu lateral; oferta "Subscrições".
3. Cliente: secção e botão na página da quinta (`FarmerSubscriptions.tsx`); "As minhas subscrições" em As minhas encomendas (`ClientSubscriptionsDialog.tsx`).
4. Encomendas: etiqueta "Entrega de subscrição", indemnização (cliente) e multa (agricultor).
5. Termos (secção `#subscricoes`), Política de Privacidade, 5 idiomas, testes (`src/test/subscriptions.test.ts`).

## 6. Ficheiros e estimativa

| Ficheiro | Ação |
|---|---|
| `supabase/migrations/20261121150000_subscricoes.sql` | criar |
| `supabase/functions/translate-content/index.ts` | alterar |
| `src/lib/subscriptions.ts`, `src/components/FarmerSubscriptions.tsx`, `src/components/ClientSubscriptionsDialog.tsx`, `src/pages/farmer/MySubscriptions.tsx`, `src/test/subscriptions.test.ts` | criar |
| `src/lib/farmer-offerings.ts`, `src/hooks/useFarmerOfferings.ts`, `src/components/FarmerOfferingsSection.tsx`, `src/components/OfferingsPicker.tsx`, `src/pages/FarmerOnboarding.tsx` | alterar |
| `src/App.tsx`, `src/components/SideMenu.tsx`, `src/hooks/useFarmerStatus.ts`, `src/pages/FarmerProfile.tsx`, `src/pages/MyOrders.tsx`, `src/pages/farmer/FarmerOrders.tsx`, `src/lib/format.ts`, `src/lib/legal.ts`, `src/lib/content-translation.ts`, `src/lib/server-messages.ts` | alterar |
| `src/pages/Terms.tsx`, `src/pages/Privacy.tsx`, `src/pages/legal/*` | alterar |
| `src/integrations/supabase/types.ts`, `src/locales/*/{offerings,common,server}.json` | alterar |

Esforço: ≈ 1,5 dias (feito).

## 7. Riscos e questões em aberto

- **Segurança / RLS:** os planos só são editáveis pelo dono; as subscrições só se leem pelo cliente e pelo agricultor e não têm escrita direta (só pelas funções). As funções verificam o tipo de perfil, a verificação do agricultor (`farmer_is_listed`) e o raio no servidor.
- **Gravação a meio:** `bill_subscription_period` corre numa só transação por subscrição.
- **Dívida do agricultor:** com pagamentos simulados, a multa e a indemnização ficam só registadas; na fase 2/3 dos pagamentos têm de ser descontadas nas transferências.
- **Decisão das queixas:** continua manual no painel do Supabase (`delivery_complaints.status = 'refund_approved'`).
- **Por confirmar:** pontos da secção 3.

## 8. Verificação

- Feito: `tsc`, `eslint`, `vitest` (126 testes) e build.
- Depois do push: criar um plano, subscrever com outra conta (dentro e fora do raio), ver as entregas nas encomendas dos dois lados, cancelar (cliente e agricultor), abrir uma queixa numa entrega atrasada e aprová-la no painel para ver a multa e a indemnização.
- Na base de dados: `select cron.job` deve mostrar `subscription-billing`.

## 9. Fontes

- Ficheiros: `supabase/migrations/20261113120000_farm_experiences.sql`, `20261109120000_farmer_reviews.sql`, `20261114120000_farmer_offerings.sql`, `20261107121000_agendamento_edge_functions.sql`, `src/pages/FarmerProfile.tsx`, `src/pages/farmer/FarmerOrders.tsx`, `src/pages/MyOrders.tsx`, `src/components/SideMenu.tsx`, `docs/pagamentos-stripe-connect.md`.
- Ligações: as da secção 3.
