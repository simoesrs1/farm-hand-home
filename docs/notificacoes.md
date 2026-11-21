# Notificações

As notificações estão em `public.notifications` e aparecem no sino (`src/components/NotificationBell.tsx`), com um balão quando chegam em tempo real.

## Perfil de cada notificação

Um agricultor tem dois perfis: cliente (compras, reservas, favoritos) e agricultor (vendas). Cada notificação tem `audience`, `client` ou `farmer`. O sino mostra só as do perfil ativo. As do outro perfil por ler acendem uma bola com cores a mudar no sino e uma linha no topo do balão com o botão para trocar de perfil. Clientes que não são agricultores veem tudo como antes.

A coluna é preenchida por um trigger (`set_notification_audience`, em `supabase/migrations/20261121160000_notificacoes_por_perfil.sql`), por isso as funções SQL e as Edge Functions não precisam de a indicar. A regra é esta:

1. Com `order_id`: `farmer` se o destinatário for o dono da quinta da encomenda; senão, `client`.
2. Sem `order_id`: `farmer` para os tipos só de agricultor (`low_stock`, `out_of_stock`, `stock_expired`, `stock_awaiting_expiry`, `farmer_verified`, `activity_*`, `subscription_deliveries`).
3. Senão, uma ligação para a gestão do agricultor (`/agricultor/encomendas`, `/produtos`, `/subscricoes`, `/vendas`, `/experiencias`, `/alojamento`, `/disponibilidade`, `/informacoes`) dá `farmer`.
4. Tudo o resto é `client`.

**Ao criar um tipo novo de notificação para o agricultor** sem `order_id` nem ligação para a gestão, acrescente-o à lista do passo 2 numa migração nova, ou indique `audience: 'farmer'` na inserção.

## Permissões

O utilizador só lê as suas notificações e só pode alterar o campo `read`. Todas as inserções são feitas no servidor, por funções `SECURITY DEFINER` ou pela `service_role`.

## Bola do sino

A animação `animate-rainbow-dot` está em `tailwind.config.ts`: um ciclo de 3 s com saturação e luminosidade fixas. Anima mesmo com o "reduzir movimento" do sistema (decisão do produto), mas para com o botão "Pausar animações" do site (`html.motion-paused` em `src/index.css`), que é o mecanismo de paragem exigido pela WCAG 2.2.2. Parada, fica com a cor primária do tema.
