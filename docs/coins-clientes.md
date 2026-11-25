# Coins dos clientes

Programa de fidelização **sem parte financeira**. O cliente ganha **1 coin por cada euro gasto** e troca as coins por brindes que cada agricultor decide oferecer. Os brindes chegam na fase 4; até lá, as coins só se acumulam.

As coins são grátis, pessoais e intransmissíveis. Não têm valor em dinheiro, não se trocam por euros e não reduzem preços. O valor indicativo (100 coins ≈ 1 € em brindes) serve só para comparar brindes. Preço, total, comissão e transferência ao agricultor não mudam.

Plano completo: [docs/planos/2026-11-25-coins-clientes.md](planos/2026-11-25-coins-clientes.md).

## Como se ganham

As regras estão na tabela `coin_rules` (`supabase/migrations/20261125120000_coins_clientes.sql`) e em `src/lib/coins.ts`. O teste `src/test/coins.test.ts` falha se as duas fontes deixarem de coincidir.

| Origem | Coins |
|---|---|
| Encomenda entregue | 1 por cada euro gasto (`total − delivery_fee`, arredondado para baixo) |
| Entrega de subscrição | + 5 |
| Experiência ou estadia concluída | + 25 |
| Avaliação de uma encomenda entregue (`context = 'delivered'`) | 20, seja qual for a nota |

- As coins ficam **pendentes 14 dias** e depois **disponíveis durante 6 meses**.
- O cliente é avisado 14 dias antes de expirarem.
- Os convites (fase 3) usam as origens `referral` e `referral_welcome`, já previstas na tabela.

## Registo

- `coin_lots`: um lote por atribuição, com `coins`, `remaining`, `status` (pending, available, expired, reversed), `available_at` e `expires_at`. `UNIQUE (user_id, source_type, source_id)` impede dar coins duas vezes.
- `coin_movements`: só se acrescentam linhas (earn, expire, reverse, redeem, return). É o histórico que o cliente vê.
- **Saldo** = soma de `remaining` dos lotes `available`.
- O browser só lê os próprios registos (RLS). A escrita passa só por funções `SECURITY DEFINER`:
  - `grant_coins` e `reverse_coins`;
  - gatilho `trg_award_order_coins` em `orders`, quando passa a `delivered` (o único caminho é `validate-pickup`);
  - gatilho `trg_award_review_coins` em `farmer_reviews`: dá as coins ao avaliar e retira-as quando a equipa remove a avaliação (`removed_at`);
  - `coins_daily()`, pelo pg_cron todos os dias às 05:30 UTC: pendentes passam a disponíveis (notificação `coins_available`), as vencidas expiram, e os lotes a expirar recebem um aviso (`coins_expiring`, uma vez por lote);
  - `anonymize_account`: ao eliminar a conta, as coins perdem-se.
- `my_coins_summary()`: saldo, pendentes, coins a expirar nos próximos 30 dias e os últimos 50 movimentos.

## No site

- "As minhas coins": botão em As minhas encomendas (`ClientCoinsDialog`) e entrada no menu lateral (`/encomendas?coins=1`, que também é a ligação das notificações).
- Na página de avaliação, uma nota diz quantas coins se recebem (só para encomendas entregues).

## Testar

1. Validar uma encomenda: aparece um lote pendente em "As minhas coins".
2. No SQL Editor: `update coin_lots set available_at = now() - interval '1 minute' where status = 'pending';` e depois `select coins_daily();`. As coins passam a disponíveis e chega uma notificação.
3. Avaliar uma encomenda entregue: + 20. Remover a avaliação: as coins são retiradas.

## Por fazer

- **Fase 3:** convites.
- **Fase 4:** brindes do agricultor.
- **Fase 5:** benefícios da plataforma, ainda por decidir.
- **Fase 6:** secção nos Termos e na Política de Privacidade, nos 5 idiomas. Deve estar publicada antes de anunciar o programa.
