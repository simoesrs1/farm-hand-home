# Plano: coins para clientes (fidelização sem parte financeira)

- **Data:** 2026-11-25
- **Pedido original:** "quero implementar um sistema de pontos, estilo de cashback mas com pontos para ser mais simples a nível burocrático. Pensa numa forma de implementação e uma forma do que podemos oferecer, lembrando que não posso fazer descontos porque é um produto do agricultor."
- **Revisão do Ruben:** "de forma a que em termos burocráticos não seja necessário parte financeira. Da melhor forma e mais simples. Podendo saber um valor para 1 coin para o cliente saber mais ou menos o que está a valer."
- **Profundidade da pesquisa:** exaustiva (3 subagentes: código, regras legais e fiscais em Portugal, exemplos de outros marketplaces).
- **Respostas do Ruben:**
  - **Recompensas:** o agricultor decide o que oferece, mais benefícios sem dinheiro.
  - **Como se ganham coins:**
    - compras concluídas;
    - avaliações;
    - convites;
    - subscrições e experiências.
  - **Âmbito:** só clientes.
  - **Onde valem:** em qualquer quinta.
  - **Validade:** expiram em 6 meses.
- **Decisões do Ruben depois de aprovado (2026-11-25):**
  - **1 coin = 1 € gasto:** é a regra base para ganhar coins.
  - **Benefícios da plataforma:** ficam por decidir. Os níveis, os selos e o acesso antecipado saem deste plano.
- **Destino final do plano:** `docs/planos/2026-11-25-coins-clientes.md`, copiado depois de aprovado.

## 1. Contexto

A ValorRural quer fidelizar clientes sem criar nenhuma parte financeira: nada de cashback, descontos, saldos em euros ou mudanças no pagamento. As coins trocam-se por **brindes em espécie** que cada agricultor decide oferecer (um frasco de mel, um molho de ervas, uma prova de vinho na visita) e, mais tarde, por **benefícios da plataforma**, que ficam por decidir.

Para o cliente perceber o que as coins valem, há um **valor indicativo fixo: 100 coins ≈ 1 € em brindes**. O agricultor indica o valor aproximado de cada brinde, e o custo em coins calcula-se a partir dele. A encomenda, o total, a comissão e a transferência ao agricultor ficam como estão.

## 2. Âmbito

**Inclui:**
- **Registo de coins** com lotes, 14 dias pendentes e validade de 6 meses.
- **Ganhar coins:**
  - encomendas entregues;
  - avaliações de encomendas entregues;
  - convites;
  - bónus em subscrições, experiências e estadias.
- **"As minhas coins":**
  - saldo e o seu valor indicativo em euros;
  - pendentes;
  - coins a expirar;
  - histórico;
  - ligação de convite.
- **Brindes do agricultor** (facultativo):
  - um catálogo de brindes por quinta;
  - o cliente junta um brinde a uma encomenda dessa quinta no carrinho, ou a uma reserva;
  - o agricultor vê o brinde na encomenda e entrega-o com ela.
- **Benefícios da plataforma:** por decidir (ver a fase 5).
- **Textos:** secção nos Termos e na Política de Privacidade, nos 5 idiomas.

**Fica de fora, para não haver parte financeira:**
- **Descontos, cashback e saldos em euros:** as coins nunca reduzem um preço nem pagam nada.
- **Alterações a preços, `total`, `commission_amount`, `farmer_amount` ou à transferência Stripe.**
- **Converter coins em dinheiro, transferi-los entre contas ou comprá-los.**
- **Coins para agricultores:** já têm o sistema de atividade.
- **Convites por email enviados pela plataforma:** só há uma ligação partilhada pelo próprio cliente.

## 3. Conclusões da pesquisa

### No código
- **Encomenda entregue:** o único caminho para `delivered` é `supabase/functions/validate-pickup/index.ts:100-104`, para todos os tipos de encomenda.
- **Sem reembolso depois da entrega:** nenhum caminho passa `delivered` para `refunded`. Todos os reembolsos exigem `awaiting_pickup` (`order-action:148`, `cancel_farm_booking` em `20261113120000:621`, `expire-orders`, queixa em `20261121150000:482`). Mesmo assim há devoluções feitas à mão (livre resolução de 14 dias), e é para isso que serve o período pendente.
- **Gatilhos:** já existem `AFTER UPDATE OF status ON orders` (ex.: `trg_close_complaint_on_delivery` em `20261109120000:400`). É o padrão para dar coins na entrega.
- **`create-order`:**
  - cada grupo do carrinho dá uma encomenda por agricultor (`:377-451`);
  - os itens são inseridos em `order_items` (`:430-438`);
  - um brinde vai para uma **tabela própria** (`order_rewards`), para não tocar no total nem nos itens pagos;
  - os brindes em reservas usam as RPC `create_experience_booking` e `create_stay_booking` (`20261113120000:436`, `:825`).
- **Avaliações:**
  - `farmer_reviews.order_id` é UNIQUE;
  - `context` ∈ `delivered`, `cancelled`, `late`;
  - `removed_at` marca uma avaliação removida (`20261109120000:27`, `:301`);
  - são criadas só pela RPC `submit_farmer_review`.
- **Convites:**
  - não existe nada;
  - o padrão a seguir é o `PENDING_PROFILE_TYPE_KEY` no `sessionStorage` com uma RPC de reclamar (`src/contexts/AuthContext.tsx`), que funciona por email e pela Google.
- **Reutilizar:**
  - pg_cron em SQL direto, como `subscription-billing` em `20261121150000:276`;
  - notificações com o gatilho `audience` (`20261121160000`);
  - níveis e testes como `src/lib/farmer-activity.ts` e `src/test/farmer-activity.test.ts`.
- **Ecrãs:**
  - **cliente:** um diálogo a partir do `PageHeader` de `MyOrders.tsx`, como o `ClientSubscriptionsDialog` (`:576`), mais uma entrada no `SideMenu.tsx`;
  - **agricultor:** uma secção em `FarmerInfo.tsx`, junto de `FarmerOfferingsSection` (`:275`), que é o único sítio desta configuração;
  - **carrinho:** `CartFarmerGroup.tsx` e `Cart.tsx` (`:180-196`, `:457-523`);
  - **encomendas do agricultor:** o detalhe e o diálogo de validação mostram o brinde.
- **Contas eliminadas:** `anonymize_account` (`20261121180000`, já enviada) é redefinida numa migração nova para anular o saldo.

### Na documentação externa
- **Coins sem valor monetário ficam fora da regulação de pagamentos:** a moeda eletrónica exige emissão contra fundos ([Diretiva 2009/110, art. 2.º](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32009L0110)). Para ficar claramente de fora, as coins são **grátis, intransmissíveis, não convertíveis em dinheiro e não servem para pagar**. A AT aceitou esta caracterização em [PIV 30283](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/informacoes_vinculativas/despesa/civa/Documents/PIV_30283.pdf).
- **Sem desconto não há nada a mudar na fatura nem no IVA da venda:** a PIV 30283 trata como desconto comercial, que tem de constar da fatura, só o caso de um desconto. Com brindes em espécie, o preço pago não muda.
- **Preço mais baixo dos últimos 30 dias (Omnibus):** aplica-se a reduções de preço. Aqui não há redução, e os programas de pontos estão excluídos ([Comunicação da Comissão, 2.3](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021XC1229(06))).
- **Contabilidade:** um ponto só gera passivo pela IFRS 15 se der um direito material pago pela própria entidade ([IFRS 15 IE](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifrs15-ie.html)). Os brindes são do agricultor e os benefícios não têm custo, por isso não há passivo para a plataforma.
- **Convites:** só por uma ligação partilhada pelo próprio cliente, sem emails a terceiros ([DPC Irlanda](https://www.dataprotection.ie/en/faqs/direct-marketing/can-i-ask-my-customers-provide-electronic-contact-details-friends-part-refer-friend-scheme-so-i-can); [caso Twoo, EDPB](https://edpb.europa.eu/system/files/2022-02/be_2020-05_decisionpublic.pdf)).
- **Coins por avaliar:** são admissíveis se forem iguais seja qual for a nota, só para compras verificadas, com as negativas publicadas e com a verificação explicada ([UCPD 4.2.4](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021XC1229(05)); [DL 109-G/2021](https://diariodarepublica.pt/dr/detalhe/decreto-lei/109-g-2021-175744207)).
- **Valor de mercado:** o habitual é cerca de 1% de retorno (1 ponto por euro, 100 pontos ≈ 1 €; Rakuten 1 por 100 ¥).
- **Registo de coins:**
  - só se acrescentam movimentos;
  - cada atribuição é um lote com validade;
  - as coins gastam-se primeiro do lote que expira mais cedo, com `FOR UPDATE`;
  - `UNIQUE` por origem garante que nada é dado duas vezes;
  - o estado pendente dura até passar o prazo de devolução ([matsubo](https://dev.to/matsubo/designing-an-expiring-points-system-on-an-rdbms-with-benchmarks-5hk1), [Encore](https://encore.dev/articles/ecommerce-loyalty-points-backend)).
- **Abuso nos convites:** dar as coins só depois da primeira compra concluída, impedir convites a si próprio e pôr tetos ([Stripe](https://stripe.com/resources/more/account-and-promotion-abuse)).

### Por confirmar
- **Brindes do agricultor:** é uma oferta normal do próprio agricultor. No CIVA, as ofertas de pequeno valor (art. 3.º, n.º 7) têm limites próprios. A plataforma não intervém, mas convém uma frase nos Termos do agricultor. A confirmar com o contabilista, só do lado do agricultor.
- **Valor indicativo em euros** ("100 coins ≈ 1 € em brindes"): confirmar com o advogado que não faz parecer que as coins são dinheiro. A recomendação é escrever sempre "valor indicativo em brindes; as coins não se trocam por dinheiro".
- **Validade de 6 meses e aviso:** não há regra portuguesa específica. Mostrar a validade e avisar 14 dias antes.
- **Acesso antecipado:** confirmar se `products` e `farm_experiences` têm uma data de publicação que se possa usar.

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | **Coins por brindes em espécie do agricultor e benefícios da plataforma, com valor indicativo fixo** | Nenhuma parte financeira: preço, total, comissão, fatura e Stripe não mudam; o cliente percebe o valor; o agricultor só oferece se quiser | O agricultor tem de gerir o stock dos brindes |
| B | Coins por descontos pagos pelo agricultor (o plano anterior) | Mais motivador | Muda o pagamento, a comissão e a fatura (o desconto tem de constar dela) |
| C | Só níveis e selos | O mais simples de todos | As coins não servem para nada concreto |

**Recomendação:** a opção A. É a única que cumpre "sem parte financeira" e continua a dar uma recompensa concreta. O valor indicativo (100 coins ≈ 1 €) é fixo e serve só para mostrar quanto vale cada brinde.

### O que se oferece

**Regra base: 1 coin = 1 € gasto.** É o que o cliente vê como explicação ("ganha 1 coin por cada euro gasto").

**Valor indicativo nos brindes:** 1 coin ≈ 1 cêntimo, ou seja, 100 coins ≈ 1 € em brindes. Fica numa constante em `src/lib/coins.ts` (`COINS_PER_EURO = 100`), igual no SQL.

**Ganhar coins.** As regras ficam na tabela `coin_rules`, espelhada em `src/lib/coins.ts` com um teste.

| Ação | Coins | Equivale a |
|---|---|---|
| Encomenda de produtos entregue | **1 por cada 1 € gasto** em produtos (sem a entrega) | ≈ 1% em brindes |
| Entrega de subscrição | 1 por 1 € + 5 de bónus | |
| Experiência ou estadia concluída | 1 por 1 € + 25 de bónus | |
| Avaliação de encomenda entregue | 20, seja qual for a nota | ≈ 0,20 € |
| Convite: a 1.ª encomenda do amigo é entregue | 200 para quem convidou e 100 para o amigo; no máximo 10 convites por ano | ≈ 2 € / 1 € |

**Prazos:** as coins ficam pendentes 14 dias depois da entrega e expiram 6 meses depois de ficarem disponíveis, com aviso 14 dias antes.

**Brindes do agricultor:**
- O agricultor cria brindes com:
  - nome e fotografia;
  - **valor aproximado em €**, de 1 € a 20 €;
  - quantidade disponível por mês;
  - onde se entrega: em encomendas de produtos, em reservas, ou nos dois.
- **Custo em coins** = valor × 100, calculado e não editável. Um frasco de mel de 3 € custa 300 coins, e o cliente vê "300 coins (≈ 3 €)".
- O cliente junta **um brinde por encomenda** dessa quinta.

**Benefícios da plataforma:** por decidir pelo Ruben. O registo de coins fica preparado para que uma recompensa da plataforma seja só mais um tipo de resgate (`coin_movements` com outra origem). As ideias anteriores (níveis, selos, acesso antecipado) não entram nesta versão.

## 5. Passos de implementação

1. **Fase 1: registo de coins e regras para os ganhar (servidor)**
   - **Migração `…_coins_clientes.sql`:**
     - **Tabelas:**
       - `coin_rules`;
       - `coin_lots` (`user_id`, `source_type`, `source_id`, `coins`, `remaining`, `status` pending/available/expired/reversed, `available_at`, `expires_at`; `UNIQUE(user_id, source_type, source_id)`);
       - `coin_movements`, onde só se acrescentam linhas;
       - `coin_redemption_lots`.
     - **Permissões:** RLS só para o próprio ler; escrita só por funções `SECURITY DEFINER`.
     - **Gatilho `AFTER UPDATE OF status ON orders`:** em `delivered`, cria um lote pendente. Contas eliminadas não ganham coins.
     - **Gatilho em `farmer_reviews`:**
       - com `context='delivered'`, cria um lote;
       - quando `removed_at` é preenchido, estorna o que sobra do lote.
     - **Função diária `coins_daily()` (pg_cron):**
       - passa os lotes de pendente a disponível;
       - faz expirar os lotes;
       - envia as notificações "coins disponíveis" e "coins a expirar".
     - **RPC `my_coins_summary()`:** devolve o saldo, os pendentes, o que expira e os movimentos.
     - **Redefinir `anonymize_account`:** o saldo passa a 0.
   - **`src/lib/coins.ts`:** `COINS_PER_EURO`, as regras, `coinsToEuroHint`. Testes em `src/test/coins.test.ts`.
2. **Fase 2: "As minhas coins"**
   - **`ClientCoinsDialog.tsx`:**
     - o saldo, com "≈ X € em brindes (valor indicativo)";
     - pendentes com data, o que expira em breve e o histórico;
     - como se ganham coins.
   - **Onde se abre:** um botão em `MyOrders.tsx` e uma entrada no `SideMenu.tsx` (`/encomendas?coins=1`).
   - **`RateFarmer.tsx`:** a nota "Recebe 20 coins por avaliar, seja qual for a nota."
3. **Fase 3: convites**
   - **Tabelas:** `referral_codes` e `referrals` (`referred_id` UNIQUE).
   - **Ligação `/auth?tab=signup&ref=CODIGO`:** o código fica no `sessionStorage`. A RPC `claim_referral` corre depois do registo e recusa:
     - o próprio código;
     - contas com mais de 7 dias;
     - contas já convidadas;
     - mais de 10 convites por ano por quem convida.
   - **Coins do convite:** dados pelo gatilho de entrega, na 1.ª encomenda entregue do amigo.
   - **No diálogo:** "Copiar ligação" e `navigator.share`.
4. **Fase 4: brindes do agricultor**
   - **Migração `…_coins_brindes.sql`:**
     - **`farmer_rewards`** (`farmer_id`, `name`, `photo_path`, `value_eur` 1–20, `coins_cost` gerado como `value_eur × 100`, `monthly_quantity`, `applies_to` products/bookings/both, `active`); RLS: o dono escreve, todos leem as ativas de quintas visíveis.
     - **`order_rewards`** (`order_id` UNIQUE, `reward_id`, `coins_spent`, nome e valor copiados no momento).
     - **RPC `attach_reward_to_order`** (service_role):
       - valida que o brinde é da quinta da encomenda, que há stock no mês e que o saldo chega;
       - gasta primeiro os lotes que expiram mais cedo, com `FOR UPDATE`.
     - **Gatilho de devolução:** se a encomenda com brinde passar a `refunded` ou `expired` sem ser entregue, as coins voltam.
   - **`create-order`:**
     - cada grupo aceita `reward_id`;
     - depois de inserir a encomenda, chama `attach_reward_to_order`;
     - **não mexe em `total`, `commission` nem `farmer_amount`.**
   - **Reservas:** parâmetro opcional `p_reward_id` em `create_experience_booking` e `create_stay_booking`. Esta parte pode ficar para depois.
   - **Área do agricultor:**
     - a secção `FarmerRewardsSection.tsx` em `FarmerInfo.tsx` (criar, editar e pausar brindes; ver quantos saíram este mês);
     - o brinde aparece no detalhe da encomenda, no diálogo de validação e nas entregas ao domicílio;
     - notificação ao agricultor com `audience:'farmer'`.
   - **Carrinho:**
     - em `CartFarmerGroup.tsx`, "Juntar um brinde com coins" (escolher entre os brindes da quinta: nome, fotografia, "300 coins (≈ 3 €)");
     - o resumo mostra o brinde e as coins usadas, e o total não muda.
   - **Página e cartões da quinta:** a etiqueta "Tem brindes com coins" e a lista dos brindes.
5. **Fase 5: benefícios da plataforma (por decidir)**
   - Fica em aberto até o Ruben escolher os benefícios. Não se implementa nesta versão.
6. **Fase 6: textos legais, traduções e documentação**
   - **Termos `#coins` (5 idiomas):**
     - as coins são grátis, pessoais e intransmissíveis;
     - **não têm valor em dinheiro, não se trocam por euros e não reduzem preços**;
     - o valor indicativo serve só para comparar brindes;
     - validade de 6 meses;
     - regras para os ganhar e os perder;
     - os brindes são oferecidos e entregues por cada agricultor, sujeitos a stock;
     - a plataforma pode corrigir coins dadas por erro ou fraude.
   - **Avaliações:** a nota "Os autores recebem coins por avaliar compras verificadas, seja qual for a nota."
   - **Política de Privacidade:** o registo de coins e os convites.
   - **`src/lib/legal.ts`:** a validade, o período pendente e `COINS_PER_EURO`.
   - **`docs/coins-clientes.md`.**

## 6. Ficheiros e estimativa

| Ficheiro | Ação | Motivo |
|---|---|---|
| `supabase/migrations/…_coins_clientes.sql` | criar | Registo, gatilhos, cron, RLS e GRANT |
| `supabase/migrations/…_coins_brindes.sql` | criar | Brindes, ligação à encomenda, devolução |
| `supabase/functions/create-order/index.ts` | alterar | Aceitar `reward_id` (sem mexer em valores) |
| `src/lib/coins.ts`, `src/test/coins.test.ts` | criar | Regras, valor indicativo, níveis |
| `src/components/ClientCoinsDialog.tsx` | criar | Saldo, histórico, convite |
| `src/pages/MyOrders.tsx`, `src/components/SideMenu.tsx` | alterar | Abrir o diálogo |
| `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx` | alterar | Código de convite |
| `src/components/FarmerRewardsSection.tsx`, `src/pages/farmer/FarmerInfo.tsx` | criar / alterar | Brindes do agricultor |
| `src/components/CartFarmerGroup.tsx`, `src/pages/Cart.tsx` | alterar | Juntar brinde |
| Encomendas do agricultor, página da quinta, `RateFarmer.tsx` | alterar | Mostrar brinde, etiqueta, nota |
| `src/integrations/supabase/types.ts`, `src/locales/*`, `src/lib/server-messages.ts` | alterar | Tipos e textos nos 5 idiomas |
| `src/pages/Terms.tsx`, `src/pages/Privacy.tsx`, `src/pages/legal/*` | alterar | Secção Coins |
| `docs/coins-clientes.md` | criar | Documentação |

| Fase | Esforço |
|---|---|
| Fase 1: registo e regras para ganhar | L (≈ 6–8 h) |
| Fase 2: "As minhas coins" | M (≈ 3 h) |
| Fase 3: convites | M (≈ 3–4 h) |
| Fase 4: brindes do agricultor | L (≈ 5–7 h) |
| Fase 5: benefícios da plataforma | por decidir |
| Fase 6: textos, traduções, documentação | M (≈ 3–4 h) |
| **Total** | **≈ 20–26 h** sem a fase 5 (as fases 1 e 2 já funcionam sozinhas) |

## 7. Riscos e questões em aberto

- **Segurança / RLS:**
  - o browser só lê; toda a escrita passa por `SECURITY DEFINER`;
  - `FOR UPDATE` nos lotes evita gastar os mesmas coins duas vezes;
  - `UNIQUE` por origem;
  - o `create-order` volta a validar o brinde e o saldo.
- **Abuso:**
  - convites: não se pode convidar a si próprio, contas novas, teto anual, coins só depois da entrega;
  - avaliações: uma por encomenda entregue;
  - os 14 dias pendentes cobrem as devoluções feitas à mão.
- **Financeiro e fiscal:** não há impacto na plataforma. Preço, total, comissão e transferência não mudam. O brinde é uma oferta do agricultor (ver "Por confirmar").
- **Privacidade:** o registo de coins e os convites ficam na Política de Privacidade. Não se recolhem contactos de terceiros. Quando a conta é eliminada, o saldo é anulado.
- **Custos:** sem serviços externos; mais uma tarefa diária no pg_cron.
- **Decisões pendentes:**
  1. Confirmar os valores: 100 coins ≈ 1 € em brindes, 20 por avaliação, 200 e 100 por convite e o valor máximo de um brinde (20 €). A regra 1 coin = 1 € gasto já está decidida.
  2. O nome: "coins", ou um nome em português que não lembre dinheiro (ex.: "sementes").
  3. Se os brindes em reservas entram já ou ficam para depois.
  4. Que benefícios específicos a plataforma vai oferecer (fase 5).

## 8. Verificação

- `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`, `npm test` (incluindo `coins.test.ts` e `locales.test.ts`) e `npx vite build`.
- **No browser, com contas de teste e depois do push:**
  1. Encomenda validada: aparecem coins pendentes, com a data e o "≈ € em brindes".
  2. Correr `select coins_daily()` com `available_at` no passado: as coins passam a disponíveis.
  3. Avaliação: +20. Remover a avaliação: o lote é estornado.
  4. Convite pela Google com `?ref=`: depois da 1.ª entrega do amigo, quem convidou ganha 200 e o amigo 100. O próprio código é recusado.
  5. O agricultor cria um brinde de 3 €: o custo aparece como 300 coins. No carrinho, juntar o brinde: o total **não muda**, a encomenda tem `order_rewards` e o saldo desce, primeiro pelos lotes mais antigos.
  6. A encomenda com brinde é reembolsada por falta de stock: as coins voltam.
  7. A quantidade mensal do brinde esgota: o brinde deixa de aparecer.
  8. Eliminar a conta: o saldo fica a 0.

## 9. Fontes

- **Ficheiros consultados:**
  - Edge Functions: `supabase/functions/create-order`, `validate-pickup`, `order-action`, `expire-orders`;
  - migrações: `20260511110732`, `20261109120000`, `20261113120000`, `20261121150000`, `20261121160000`, `20261121180000`;
  - páginas e componentes: `src/pages/Cart.tsx`, `MyOrders.tsx`, `RateFarmer.tsx`, `farmer/FarmerInfo.tsx`, `src/components/SideMenu.tsx`;
  - lógica e documentação: `src/lib/legal.ts`, `src/lib/farmer-activity.ts`, `docs/pagamentos-stripe-connect.md`.
- **Ligações:** as da secção 3: PIV 30283 (AT), Diretiva 2009/110, Comunicações UCPD e Omnibus, DL 109-G/2021, DPC Irlanda, EDPB (Twoo), IFRS 15, Stripe (abuse), matsubo e Encore.
