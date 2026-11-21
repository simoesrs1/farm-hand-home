-- Notificações separadas por perfil (cliente / agricultor).
--
-- Um agricultor também compra como cliente. O sino passa a mostrar só as
-- notificações do perfil ativo; as do outro perfil são assinaladas à parte.
-- Cada notificação ganha `audience` ('client' | 'farmer'), preenchida aqui
-- por um trigger para todas as inserções (SQL e Edge Functions), sem ter de
-- mexer em cada uma. Uma inserção pode indicar `audience` explicitamente.
--
-- Regra (ver docs/notificacoes.md):
--   1. com order_id: 'farmer' se o destinatário é o dono da quinta da encomenda;
--   2. sem order_id: 'farmer' para os tipos só de agricultor (stock, verificação,
--      atividade, entregas de subscrição);
--   3. senão, ligação para a área de gestão do agricultor → 'farmer';
--   4. tudo o resto → 'client'.
-- Ao criar um tipo novo de notificação para o agricultor sem order_id nem
-- ligação /agricultor/…, acrescentá-lo à lista do passo 2.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'client'
  CHECK (audience IN ('client', 'farmer'));

CREATE OR REPLACE FUNCTION public.notification_audience(
  p_user_id uuid,
  p_order_id uuid,
  p_type text,
  p_link text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_order_id IS NOT NULL THEN
      CASE WHEN EXISTS (
        SELECT 1 FROM public.orders o
          JOIN public.farmer_details fd ON fd.id = o.farmer_id
         WHERE o.id = p_order_id AND fd.user_id = p_user_id
      ) THEN 'farmer' ELSE 'client' END
    WHEN p_type IN ('low_stock', 'out_of_stock', 'stock_expired', 'stock_awaiting_expiry',
                    'farmer_verified', 'activity_level_up', 'activity_featured',
                    'activity_pause_ending', 'activity_nudge', 'subscription_deliveries') THEN 'farmer'
    WHEN p_link LIKE '/agricultor/encomendas%' OR p_link LIKE '/agricultor/produtos%'
      OR p_link LIKE '/agricultor/subscricoes%' OR p_link LIKE '/agricultor/vendas%'
      OR p_link LIKE '/agricultor/experiencias%' OR p_link LIKE '/agricultor/alojamento%'
      OR p_link LIKE '/agricultor/disponibilidade%' OR p_link LIKE '/agricultor/informacoes%' THEN 'farmer'
    ELSE 'client'
  END
$$;

REVOKE EXECUTE ON FUNCTION public.notification_audience(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_notification_audience()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- O valor por omissão é 'client': calcula-se sempre, exceto se a inserção
  -- já indicar 'farmer' explicitamente.
  IF NEW.audience IS DISTINCT FROM 'farmer' THEN
    NEW.audience := public.notification_audience(NEW.user_id, NEW.order_id, NEW.type, NEW.link);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_notification_audience() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_notification_audience ON public.notifications;
CREATE TRIGGER trg_set_notification_audience
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_notification_audience();

-- Notificações que já existem.
UPDATE public.notifications
   SET audience = public.notification_audience(user_id, order_id, type, link);

CREATE INDEX IF NOT EXISTS idx_notifications_user_audience_read
  ON public.notifications (user_id, audience, read);

-- O utilizador só pode marcar como lida (antes podia alterar qualquer coluna
-- das próprias notificações, incluindo o título, a ligação e o perfil).
REVOKE UPDATE ON public.notifications FROM anon, authenticated;
GRANT UPDATE (read) ON public.notifications TO authenticated;
