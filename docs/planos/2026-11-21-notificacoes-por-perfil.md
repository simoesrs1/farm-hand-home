# Plano: notificações separadas por perfil (cliente / agricultor) no sino

- **Data:** 2026-11-21
- **Pedido original:** "Na zona do sino das notificações, quando o perfil tanto pode ser agricultor como cliente, as notificações têm de ficar separadas: no perfil de cliente as notificações principais e detalhadas são apenas as de cliente; ao trocar de perfil, as principais são as de venda. Quando está o perfil de cliente selecionado e o agricultor tem uma notificação no perfil de produtor, aparece uma bola no sino em modo de troca de cores RGB para chamar a atenção."
- **Profundidade da pesquisa:** normal
- **Respostas do Ruben:**
  - bola RGB nos dois sentidos (cliente ↔ agricultor);
  - ao abrir o sino com notificações do outro perfil, aparece primeiro a pergunta se quer trocar de perfil para as ver;
  - a bola anima sempre, mesmo com "Pausar animações" ou movimento reduzido.

## 1. Contexto

Um agricultor também compra como cliente (favoritos, reservas de experiências e alojamento, avaliações). Hoje o sino ([NotificationBell.tsx](../../src/components/NotificationBell.tsx)) mostra tudo misturado, e abrir o sino marca tudo como lido. Queremos que o sino mostre só as notificações do perfil ativo. As do outro perfil não se perdem: são assinaladas por uma bola de cores RGB e por uma linha no topo do balão para trocar de perfil.

## 2. Âmbito

**Inclui:**
- coluna `audience` ('client' | 'farmer') nas notificações, preenchida automaticamente na base de dados para as novas e as antigas;
- sino com lista, contador, "marcar como lidas" e avisos (toast) só do perfil ativo;
- bola RGB quando há notificações por ler no outro perfil, com rótulo acessível;
- no topo do balão: "Tem N notificações de vendas/compras por ler" com o botão "Mudar para agricultor/cliente";
- ao clicar numa notificação do outro perfil (por exemplo, a partir de um toast), troca de perfil antes de abrir;
- só o campo `read` passa a ser alterável pelo utilizador.

**Fica de fora:**
- separar as notificações dos clientes que não são agricultores, porque têm só um perfil e nada muda para eles;
- notificações por email;
- o bug de o carrinho deixar um agricultor em modo cliente tentar pagar (o servidor recusa). Fica anotado à parte.

## 3. Conclusões da pesquisa

### No código
- **Tabela `notifications`** (`20260511110732_…sql:47`): `user_id`, `order_id`, `type`, `title`, `message`, `link`, `read`. As políticas RLS deixam ver e atualizar as próprias notificações (`:111-117`). Não há permissões por coluna: o utilizador pode alterar **qualquer coluna** das suas notificações. É preciso corrigir, porque `audience` não pode ser alterada pelo browser.
- **Quem cria notificações:** cerca de 30 sítios, entre funções SQL e Edge Functions (`create-order`, `order-action`, `expire-orders`, `validate-pickup`, `farmer-activity`, reservas, queixas, stock, favoritos, subscrições, verificação). Nenhum indica o perfil.
- **Regras simples que falham:**
  - só pelo `link`: falha em `new_order`, `low_stock`, `out_of_stock`, `stock_expired`, `expired_farmer`, `booking_no_show` (sem link) e em `activity_featured`, cujo link é `/`;
  - só pelo `type`: falha porque `booking_cancelled`, `booking_no_show`, `order_refunded` e `subscription_cancelled` vão para os dois lados.
- **Regra que acerta em todos os casos atuais:**
  1. **Com `order_id`:** é `farmer` se o destinatário é o dono da quinta da encomenda (`farmer_details.user_id` de `orders.farmer_id`); senão é `client`. Um agricultor nunca é cliente de uma encomenda da própria quinta: `create-order` e `subscribe_to_plan` recusam agricultores, e as reservas recusam a própria quinta.
  2. **Sem `order_id`:** é `farmer` se o tipo for `low_stock`, `out_of_stock`, `stock_expired`, `stock_awaiting_expiry`, `farmer_verified`, `activity_*` ou `subscription_deliveries`.
  3. **Senão:** um `link` que comece por `/agricultor/encomendas`, `/agricultor/produtos`, `/agricultor/subscricoes` ou `/agricultor/vendas` indica `farmer`.
  4. **Tudo o resto** é `client` (`favorite_*`, `review_removal_*`, `subscription_billed`, e `subscription_cancelled` para o cliente).
- **Sino hoje:**
  - carrega as últimas 20 notificações sem filtro;
  - "marcar todas como lidas" faz `update` sem filtro (`:99-102`), quando devia marcar só as do perfil ativo;
  - `handleClick` decide a rota pelo `activeMode` (`:117`), o que está errado para notificações do outro perfil.
- **`switchMode`** ([AuthContext.tsx](../../src/contexts/AuthContext.tsx)) não muda de página. O menu lateral já faz `navigate("/catalogo")` ao passar a cliente.
- **Animações:** os keyframes estão em `tailwind.config.ts:100-118`. "Pausar animações" acrescenta a classe `html.motion-paused` (`src/index.css:148-151`). Uma animação nova que não esteja nessa regra nem use `motion-reduce:` anima sempre.

### Na documentação externa
- **Técnica:** animar `background-color` por várias paragens de cor (ciclo de 3 s, `linear`). Num ponto de ~10 px o custo é desprezável e funciona em todos os browsers. Com `@property`/`oklch` mantém-se a luminância constante (Safari 16.4+): [MDN @property](https://developer.mozilla.org/en-US/docs/Web/CSS/@property).
- **WCAG 2.3.1 (flashes):** um ponto de 10 px com ciclo lento fica muito abaixo do limite de área e de frequência: [Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html).
- **WCAG 2.3.3:** não se aplica a mudanças de cor: [Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- **WCAG 2.2.2 (Pause, Stop, Hide, nível A):** um indicador que pisca para chamar a atenção durante mais de 5 s deve poder ser parado. Ignorar também o botão "Pausar animações" do site provavelmente falha este critério: [Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
- **WCAG 1.4.1:** a cor não pode ser o único sinal. O botão do sino leva um rótulo com "tem notificações no perfil de agricultor": [Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

### Por confirmar
- Se a decisão "anima sempre" (incluindo com "Pausar animações") é aceitável do ponto de vista da WCAG 2.2.2. Ver o risco na secção 7.
- As cores fixas do arco-íris ficam no `tailwind.config.ts`, não no JSX. É uma exceção às cores do tema que precisa do teu acordo.

## 4. Opções e recomendação

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| A | Coluna `audience` preenchida por um trigger `BEFORE INSERT` (regra acima) + atualização das antigas | Um só sítio; funciona para todos os 30 sítios que criam notificações sem lhes mexer; filtros e contagens na base de dados | A regra tem de ser mantida quando houver tipos novos |
| B | Classificar no browser pelo `type`/`link` | Sem migração | A regra fica duplicada; não consegue separar tipos que vão para os dois lados sem consultar a encomenda |
| C | Indicar o perfil explicitamente em cada inserção | O mais explícito | Mexe em cerca de 30 sítios, em SQL e em Edge Functions |

**Recomendação:** opção A. O trigger só preenche `audience` quando vem vazia, por isso inserções futuras podem indicá-la explicitamente (C) sem conflito. Cada tipo novo de notificação passa a ter de ser incluído na regra, o que fica anotado num comentário na migração e em `docs/`.

## 5. Passos de implementação

1. **Fase 1: migração** `supabase/migrations/2026112116xxxx_notificacoes_por_perfil.sql`
   - `ALTER TABLE notifications ADD COLUMN audience text NOT NULL DEFAULT 'client' CHECK (audience IN ('client','farmer'))`.
   - Função `notification_audience(user_id, order_id, type, link)` com a regra da secção 3. Trigger `BEFORE INSERT` que a usa.
   - `UPDATE` das notificações existentes com a mesma função.
   - Índice `(user_id, audience, read)`.
   - `REVOKE UPDATE ON notifications FROM authenticated; GRANT UPDATE (read) ON notifications TO authenticated;`.
2. **Fase 2: sino** (`NotificationBell.tsx` + `src/lib/notification-audience.ts`)
   - `modeAudience(activeMode)`: `cliente` → `client`, `vendedor` → `farmer`. Só os agricultores têm dois perfis; os clientes veem tudo como hoje.
   - **Carregamento:** as últimas 20 do perfil ativo e a contagem de não lidas do outro perfil (`select count, head: true`).
   - **Contador e "marcar lidas"** só do perfil ativo: `.eq("audience", current)`.
   - **Tempo real:** o canal continua um por utilizador. Uma notificação nova do perfil ativo entra na lista e no aviso. Uma do outro perfil só aumenta a contagem da bola, sem aviso, para o outro perfil não ser "principal".
   - **Bola RGB:** quando há notificações por ler no outro perfil, aparece um ponto de 10 px com `animate-rainbow-dot` e `ring-2 ring-background`, ao lado do contador vermelho. Sem `motion-reduce` e sem regra `motion-paused`, por isso anima sempre. O `aria-label` do botão acrescenta "tem N notificações no perfil de agricultor/cliente".
   - **Topo do balão:** quando há notificações no outro perfil, aparece a linha "Tem N notificações de vendas por ler" com o botão "Mudar para agricultor". O botão chama `switchMode`, recarrega a lista e mantém o balão aberto, já com as do novo perfil.
   - **Ao abrir uma notificação**, a rota passa a vir de `n.audience` e não do `activeMode`. Se for do outro perfil, primeiro chama `switchMode`.
   - Recarregar quando `activeMode` muda (dependência do efeito).
3. **Fase 3: animação e textos**
   - Keyframes `rainbow-dot` (hsl com saturação e luminosidade fixas, ciclo de 3 s) em `tailwind.config.ts`.
   - Textos em `src/locales/*/common.json` nos 5 idiomas: `notifications.otherFarmer`, `notifications.otherClient`, `notifications.switchToFarmer`, `notifications.switchToClient`, `notifications.otherAria`, com plurais.
4. **Fase 4: testes e documentação**
   - Testes Vitest da função de perfil no browser (`modeAudience`) e do texto do rótulo.
   - Documentar a regra da coluna `audience` em `docs/` (nova secção sobre notificações), para quem criar tipos novos.

## 6. Ficheiros e estimativa

| Ficheiro | Ação | Motivo |
|---|---|---|
| `supabase/migrations/2026112116xxxx_notificacoes_por_perfil.sql` | criar | Coluna, trigger, atualização das antigas, índice, permissões |
| `src/components/NotificationBell.tsx` | alterar | Filtro por perfil, bola RGB, linha de troca, rotas |
| `src/lib/notification-audience.ts` | criar | Perfil ↔ audiência, rótulos |
| `src/integrations/supabase/types.ts` | alterar | Coluna `audience` |
| `tailwind.config.ts` | alterar | Animação `rainbow-dot` |
| `src/locales/{pt,en,de,es,fr}/common.json` | alterar | Textos novos |
| `src/test/notification-audience.test.ts` | criar | Testes |
| `docs/notificacoes.md` | criar | Regra para tipos novos |

| Fase | Esforço |
|---|---|
| Fase 1: migração | S (≈ 1 h) |
| Fase 2: sino | M (≈ 2–3 h) |
| Fase 3: animação e textos | S (≈ 1 h) |
| Fase 4: testes e docs | S (≈ 0,5 h) |
| **Total** | **≈ 4,5–5,5 h** |

## 7. Riscos e questões em aberto

- **Acessibilidade (WCAG 2.2.2, nível A):** uma animação que chama a atenção, nunca para e ignora o botão "Pausar animações" do próprio site provavelmente não cumpre o critério. A bola desaparece quando o utilizador troca de perfil ou lê as notificações, mas enquanto não o fizer anima sem fim. Alternativas que cumprem e mantêm a ideia:
  - (a) ignorar o movimento reduzido do sistema, como pediste, mas parar com "Pausar animações";
  - (b) animar 2 ciclos (cerca de 6 s) e recomeçar a cada notificação nova.

  O plano segue a tua resposta ("anima sempre"). A decisão final é tua.
- **Segurança / RLS:** passa a ser possível alterar só o campo `read`. Hoje dá para alterar `title`, `link`, etc. das próprias notificações, o que é uma lacuna que já existia.
- **Tipos novos de notificação:** se alguém criar um tipo novo sem `order_id` para o agricultor e não o puser na regra, a notificação aparece no perfil de cliente. Fica documentado, e pode indicar-se `audience` explicitamente.
- **Clientes sem perfil de agricultor:** nada muda para eles. Ficam sempre com `client`, sem bola.

## 8. Verificação

- `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` nos ficheiros alterados, `npm test` e `npx vite build`.
- Depois do push, com a conta de agricultor de teste:
  1. Em modo cliente, fazer uma reserva noutra quinta e, com outro cliente, encomendar a esta quinta. O sino deve mostrar só a confirmação da reserva, e a bola RGB deve indicar a nova encomenda de venda.
  2. Abrir o sino: a primeira linha deve dizer "1 notificação de vendas por ler — Mudar para agricultor". Ao carregar, a lista passa às de venda.
  3. Abrir o sino num perfil não deve marcar como lidas as do outro.
  4. Na consola: `update({ title: "x" })` numa notificação própria deve dar "permission denied".
- Na base de dados: `select audience, type, count(*) from notifications group by 1,2` para confirmar a classificação das antigas.

## 9. Fontes

- Ficheiros consultados: `src/components/NotificationBell.tsx`, `src/lib/notification-summary.ts`, `src/contexts/AuthContext.tsx`, `src/components/SideMenu.tsx`, `src/components/Header.tsx`, `src/lib/animation.ts`, `src/index.css`, `tailwind.config.ts`, migrações `20260511110732`, `20260806205859`, `20261105120000`, `20261109120000`, `20261111120000`, `20261113120000`, `20261117120000`, `20261121130000`, `20261121150000`, Edge Functions `create-order`, `order-action`, `expire-orders`, `validate-pickup`, `farmer-activity`.
- Ligações: as da secção 3.
