# Sistema de Encomendas com QR Code e Escrow

Fluxo completo: **Carrinho → Pagamento → QR Code → Scan do agricultor → Liquidação com comissão**.

## Funcionalidades

### Cliente
- No carrinho, antes de pagar, vê aviso claro: *"Se não levantares a encomenda no prazo definido, perderás 90% do valor pago."*
- Paga online (Stripe) — o dinheiro fica retido na plataforma.
- Recebe QR code + código alfanumérico de 8 dígitos para mostrar na quinta.
- Página "As minhas encomendas" mostra estado: **A aguardar levantamento / Levantada / Expirada**.

### Agricultor
- Define **prazo de levantamento** (em dias) por produto, no inventário.
- No dashboard tem botão **"Validar entrega"** com 2 opções:
  - **Scan câmara** (web, usa `html5-qrcode`)
  - **Inserir código manualmente**
- Após scan válido: encomenda marcada como entregue, recebe 90%, plataforma fica com 10%.
- Vê histórico de encomendas pendentes/entregues/expiradas.

### Liquidação automática
- Edge function agendada (cron) corre de hora em hora:
  - Encomendas com prazo expirado e não levantadas → estado `expired`, 10% para agricultor (com notificação "produto não vai vender"), 90% para plataforma.

## Estrutura de dados (novas tabelas)

- **orders** — `id, client_id, farmer_id, total, commission_amount, farmer_amount, status (pending_payment/awaiting_pickup/delivered/expired), pickup_code, pickup_deadline, paid_at, delivered_at, stripe_session_id`
- **order_items** — `id, order_id, product_name, unit_price, quantity, subtotal`
- **products** — `id, farmer_id, name, price, unit, stock, pickup_days` (substitui dados estáticos `src/data/products.ts`)
- **notifications** — `id, user_id, type, message, read, order_id`

RLS: cliente vê só as suas encomendas; agricultor vê encomendas da sua quinta; ambos podem atualizar via edge functions seguras (não diretamente).

## Edge functions

1. **create-checkout** — cria sessão Stripe a partir do carrinho, calcula prazo (max dos `pickup_days`), gera `pickup_code`.
2. **stripe-webhook** — ao receber `checkout.session.completed` muda estado para `awaiting_pickup` e cria notificação ao agricultor.
3. **validate-pickup** — recebe código/QR do agricultor, valida ownership, marca `delivered`, regista split 90/10.
4. **expire-orders** — corre por cron, expira encomendas, faz split 10/90 (invertido) e notifica agricultor.

## UI nova
- `src/pages/MyOrders.tsx` (cliente) — lista + modal com QR code grande
- `src/pages/farmer/Orders.tsx` (agricultor) — lista + botão validar
- `src/pages/farmer/ScanPickup.tsx` — câmara + input manual
- Aviso no `Cart.tsx` antes de pagar
- Notificações no header (sino com contador)

## Pagamentos

Para reter dinheiro, calcular comissão e fazer split, é necessário integração de pagamentos. Recomendo **Stripe** (built-in Lovable, sem necessidade de criar conta para começar — modo teste imediato). Vou ativar o Stripe como primeiro passo da implementação.

## Ordem de implementação

1. Ativar Stripe (built-in)
2. Migração: criar tabelas `products`, `orders`, `order_items`, `notifications` + RLS
3. Edge functions (`create-checkout`, `stripe-webhook`, `validate-pickup`, `expire-orders`)
4. UI cliente: aviso no carrinho, página "As minhas encomendas" com QR
5. UI agricultor: dashboard de encomendas + página de scan (câmara + manual)
6. Sino de notificações no header

## Detalhes técnicos
- QR code: lib `qrcode.react` (gerar) + `html5-qrcode` (scan)
- Código de levantamento: 8 chars alfanuméricos maiúsculos, único por encomenda
- Comissão: calculada server-side no momento da criação da encomenda (nunca cliente)
- Stripe: usa `payment_intent` em modo simples; o split 90/10 é registado contabilisticamente nas tabelas (não usa Stripe Connect na v1 — mais simples; agricultor recebe via transferência manual baseada no relatório)
