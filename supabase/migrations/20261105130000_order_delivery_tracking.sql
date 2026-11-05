-- Acompanhamento das entregas ao domicílio.
--
-- O agricultor indica, por produto, se oferece acompanhamento da entrega
-- (incluído no preço, sem custo extra). Se o carrinho tiver um produto com
-- essa opção, o cliente escolhe com ou sem acompanhamento.
--
-- Passos: aceite (accepted_at) → embalada (packed_at) → em trânsito
-- (in_transit_at) → para entrega (out_for_delivery_at) → entregue
-- (delivered_at, só quando o QR code é validado em validate-pickup).
-- Os passos intermédios são marcados pelo agricultor através da Edge Function
-- order-action; o cliente não tem permissão de UPDATE em orders.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_tracking boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_tracking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS packed_at timestamptz,
  ADD COLUMN IF NOT EXISTS in_transit_at timestamptz,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamptz;

-- Permissões por coluna, como em local_delivery (20260908180308): o agricultor
-- define a opção no produto; nas encomendas só há leitura, as escritas vêm das
-- Edge Functions (service_role).
GRANT SELECT (delivery_tracking) ON public.products TO authenticated, anon;
GRANT INSERT (delivery_tracking), UPDATE (delivery_tracking) ON public.products TO authenticated;
GRANT SELECT (delivery_tracking, packed_at, in_transit_at, out_for_delivery_at)
  ON public.orders TO authenticated;
