# Pagamentos com Stripe Connect

> Estado: em implementação (fase 1) · Última atualização: 14 de novembro de 2026

## Porquê

Até agora o pagamento era simulado: o `create-order` criava a encomenda já paga. Para cobrar a sério precisamos de um sistema em que o cliente paga, o agricultor recebe a parte dele e a ValorRural fica com a comissão. A ValorRural **não guarda dinheiro de terceiros**: isso é atividade regulada. Quem guarda e movimenta o dinheiro é o Stripe, que tem licença para o fazer.

## Decisões tomadas

| Tema | Escolha | Alternativas postas de parte |
|---|---|---|
| Fornecedor | Stripe Connect | easypay, que tem sandbox, divisão de pagamentos e Apple Pay, mas exige contacto comercial para começar; Mangopay; Lemonway; Adyen |
| Tipo de conta do agricultor | Express: registo e verificação de identidade feitos num formulário do Stripe, com um painel simples para o agricultor | Standard (o agricultor gere tudo); Custom (formulários nossos, mais trabalho e mais responsabilidade) |
| API para criar contas | **Accounts v2** (`POST /v2/core/accounts` e `/v2/core/account_links`), obrigatória para integrações Connect novas: o Stripe recusa `POST /v1/accounts`. As restantes chamadas (consultar a conta, link do painel, transferências) continuam na API v1, que aceita contas v2 | Accounts v1 (recusada pelo Stripe) |
| Fluxo do dinheiro | **A plataforma cobra e depois transfere para o agricultor** ("separate charges and transfers") | O agricultor cobra diretamente ("direct charges") |
| Quem paga as taxas do Stripe | O cliente, de forma indireta: a comissão passa de 10% para 12% e está incluída no preço do produto | Taxa de serviço à parte; o agricultor |
| Página de pagamento | Stripe Checkout, uma página alojada pelo Stripe | Formulário embutido (Payment Element) |
| Métodos de pagamento | Cartão, MB WAY, Multibanco, Apple Pay e Google Pay | — |

## Porque é a plataforma que cobra, e não o agricultor

Na configuração do Connect, o Stripe pergunta "Como os pagamentos fluem pela sua empresa?". Há duas opções:

1. **"Seus comerciantes coletarão pagamentos diretamente"**: o cliente paga ao agricultor e a plataforma recebe uma taxa. É o modelo das plataformas SaaS, como a Shopify.
2. **"Você coleta pagamentos e paga destinatários"**: o cliente paga à plataforma, e a plataforma distribui o dinheiro. É o modelo dos marketplaces. **Foi o escolhido.**

Em termos de dinheiro, as duas opções dão o mesmo resultado: o agricultor recebe o valor dele e a ValorRural fica com a comissão. A diferença está em quem é o vendedor perante o Stripe e o cliente, e em quem trata dos problemas.

| | Opção 1: o agricultor cobra diretamente | Opção 2: a plataforma cobra e paga ao agricultor |
|---|---|---|
| Quem aparece no extrato do cliente | O agricultor | A ValorRural, ou o agricultor se usarmos `on_behalf_of` (ver abaixo) |
| Para onde vai o dinheiro | Para o saldo Stripe do agricultor; a comissão sai logo | Fica na plataforma até ao levantamento |
| Reter o dinheiro até ao levantamento | Difícil: o dinheiro já é do agricultor, só se consegue atrasar o envio para o banco | Natural: transfere-se só quando o levantamento é validado |
| Reembolsos (falta de stock, expiração, cancelamento) | Saem do saldo do agricultor | Saem da plataforma, antes de transferir |
| Contestações de cartão ("chargebacks") | O agricultor tem de responder ao Stripe | A plataforma trata |
| Taxas do Stripe | Pagas pelo agricultor | Pagas pela plataforma, cobertas pela comissão de 12% |
| Recomendação do Stripe | Plataformas SaaS, com comerciantes experientes | Marketplaces |

A opção 1 obrigaria cada agricultor a ser um comerciante a sério: responder a contestações, ter saldo para reembolsos e pagar as taxas. Para pequenos produtores isso pesa, e deixaria de ser verdade que o agricultor recebe exatamente o preço que definiu. A opção 2 é também a única em que as regras que a plataforma já tem funcionam sem grande esforço: dinheiro retido até ao levantamento, reembolso por falta de stock, expiração e cancelamento de reservas.

### Se o agricultor tiver de aparecer como vendedor

Dentro da opção 2, o pagamento pode ser criado "em nome de" do agricultor, com o parâmetro `on_behalf_of` do Stripe. O nome do agricultor aparece no extrato do cliente e a plataforma continua a controlar quando o dinheiro é transferido. Isto decide-se no código da fase 2, depois de confirmar com o contabilista qual das formas é a mais correta para a faturação e o IVA.

## Como funciona

1. **Registo do agricultor.** Em "As minhas vendas" (`/agricultor/vendas`), o agricultor configura a receção de pagamentos no formulário do Stripe: identificação, NIF e IBAN. Só depois disso os produtos dele podem ser comprados.
2. **Pagamento.** O cliente paga o total à plataforma no Stripe Checkout. A encomenda fica em `pending_payment` até o Stripe confirmar o pagamento por webhook. No Multibanco a confirmação pode demorar, porque o cliente paga a referência mais tarde.
3. **Retenção.** Enquanto a encomenda está em `awaiting_pickup`, o dinheiro fica no saldo da plataforma no Stripe.
4. **Transferência.** Quando o agricultor valida o levantamento (`validate-pickup`), a plataforma transfere `farmer_amount` para a conta Stripe dele. A comissão fica na plataforma.
5. **Reembolsos.** Em caso de falta de stock, expiração ou cancelamento, o cliente é reembolsado, total ou parcialmente, antes de qualquer transferência.

## Fases

| Fase | Conteúdo | Estado |
|---|---|---|
| 1 | Registo dos agricultores no Connect: tabela `farmer_payment_accounts`, Edge Function `stripe-connect` e cartão em "As minhas vendas" | Em curso |
| — | Comissão de 12%: taxa definida num só sítio, cálculo corrigido e `client_price` dos produtos recalculado | Por fazer |
| 2 | Checkout, webhook `stripe-webhook` e bloqueio de agricultores sem conta ativa | Por fazer |
| 3 | Transferências e reembolsos (`validate-pickup`, `order-action`, `expire-orders` e reservas) | Por fazer |
| 4 | Textos legais (Termos e `src/lib/legal.ts`) e passagem para o modo real | Por fazer |

## Pontos em aberto

- **Faturação e IVA da comissão**: a confirmar com o contabilista, que também deve dizer se se usa `on_behalf_of`.
- **Valor mínimo de encomenda**: a parte fixa da taxa do Stripe (cerca de 0,25 €) come a comissão nas encomendas pequenas.
- **Regra das encomendas expiradas**: o código de `expire-orders` e a mensagem ao cliente não dizem o mesmo sobre quem fica com quê. Tem de ficar decidido antes da fase 3.

## Segredos e ambientes

- `STRIPE_SECRET_KEY` (e, na fase 2, `STRIPE_WEBHOOK_SECRET`) só nas Edge Functions, através de `npx supabase secrets set`. Nunca no `.env` do front-end nem com o prefixo `VITE_`.
- Todo o desenvolvimento é feito em **modo de teste** (sandbox), sem custos. O modo real só é ativado na fase 4.
