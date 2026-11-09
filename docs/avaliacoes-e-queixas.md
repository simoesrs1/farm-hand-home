# Avaliações, pedidos de eliminação e queixas de entrega

Guia para a equipa da plataforma. Ainda não há área de administração nem email:
os pedidos ficam na base de dados e decidem-se no painel do Supabase
(**Table Editor**), mudando a coluna `status` da linha. As notificações, a
remoção da avaliação e a devolução acontecem sozinhas.

## Pedidos de eliminação: `review_removal_requests`

Ver as linhas com `status = pending`. A coluna `justification` tem o motivo do
cliente e `review_id` aponta para a avaliação em `farmer_reviews`.

| Decisão | Mudar `status` para | Efeito |
|---|---|---|
| Aceitar | `approved` | A avaliação sai do perfil e da média; o cliente é notificado |
| Recusar | `rejected` | A avaliação mantém-se; o cliente é notificado e pode voltar a pedir |

Uma avaliação eliminada fica guardada com `removed_at` preenchido, e essa
encomenda não pode ser avaliada de novo.

## Entregas não recebidas: `delivery_complaints`

Ver as linhas com `status = open`. O agricultor tem até `deadline_at` (48 h) para
entregar. Se validar o QR code, a queixa passa sozinha a `delivered`.

Depois de `deadline_at`, confirmar com o cliente e o agricultor que a encomenda
não foi recebida.

| Decisão | Mudar `status` para | Efeito |
|---|---|---|
| Devolver | `refund_approved` | A encomenda passa a `refunded`; ambos são notificados |
| Recusar | `rejected` | A encomenda não muda; o cliente é notificado |

A base de dados recusa `refund_approved` antes de `deadline_at`. Enquanto os
pagamentos forem simulados, a devolução só muda o estado da encomenda.

## Denúncias: `order_reports`

Ver as linhas com `status = open`. `proof_url` é a prova anexada (a ligação
assinada expira ao fim de 7 dias; o ficheiro está no bucket `order-attachments`).
O estado (`reviewing`, `resolved`, `rejected`) é só para organização interna e
não envia notificações.
