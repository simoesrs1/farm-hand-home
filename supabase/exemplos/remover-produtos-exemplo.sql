-- =============================================================================
-- Remove os produtos de exemplo criados por produtos-exemplo.sql.
--
-- Apaga só os produtos com id 00000000-e5e0-4000-8000-*. Os teus produtos
-- reais não são tocados.
-- Em cascata: histórico do produto e lotes de stock. As listas de oferta das
-- experiências e alojamentos que apontem para estes produtos também saem; as
-- reservas ficam com product_id a nulo (ON DELETE SET NULL).
-- Encomendas já feitas com estes produtos não são apagadas.
--
-- Como usar: SQL Editor > New query > colar este ficheiro > Run.
-- =============================================================================

BEGIN;

DELETE FROM public.notifications
 WHERE link LIKE '%00000000-e5e0-4000-8000-%';

DELETE FROM public.products
 WHERE id::text LIKE '00000000-e5e0-4000-8000-%';

COMMIT;
