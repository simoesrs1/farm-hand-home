-- =========================================================
-- 1. Tabela de mensagens do chat por encomenda
-- =========================================================
CREATE TABLE public.order_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  sender_id uuid,
  sender_role text NOT NULL CHECK (sender_role IN ('cliente','agricultor','sistema')),
  content text,
  attachment_url text,
  attachment_mime text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT msg_has_payload CHECK (content IS NOT NULL OR attachment_url IS NOT NULL)
);

CREATE INDEX idx_order_chat_messages_order_created
  ON public.order_chat_messages (order_id, created_at);

GRANT SELECT, INSERT ON public.order_chat_messages TO authenticated;
GRANT ALL ON public.order_chat_messages TO service_role;

ALTER TABLE public.order_chat_messages ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: o utilizador faz parte da encomenda?
CREATE OR REPLACE FUNCTION public.user_in_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND (
        o.client_id = auth.uid()
        OR public.user_owns_farmer(o.farmer_id)
      )
      AND o.status IN ('awaiting_pickup','delivered','expired')
  );
$$;

-- Função auxiliar: o utilizador é o cliente da encomenda?
CREATE OR REPLACE FUNCTION public.user_is_order_client(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id AND o.client_id = auth.uid()
  );
$$;

CREATE POLICY "Members can read order chat"
  ON public.order_chat_messages FOR SELECT
  TO authenticated
  USING (public.user_in_order(order_id));

CREATE POLICY "Members can send order chat"
  ON public.order_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_in_order(order_id)
    AND sender_id = auth.uid()
    AND sender_role IN ('cliente','agricultor')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_chat_messages;
ALTER TABLE public.order_chat_messages REPLICA IDENTITY FULL;

-- =========================================================
-- 2. Denúncias
-- =========================================================
CREATE TABLE public.order_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reporter_role text NOT NULL CHECK (reporter_role IN ('cliente','agricultor')),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 2000),
  proof_url text NOT NULL,
  proof_mime text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_reports_order ON public.order_reports (order_id);

GRANT SELECT, INSERT ON public.order_reports TO authenticated;
GRANT ALL ON public.order_reports TO service_role;

ALTER TABLE public.order_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read order reports"
  ON public.order_reports FOR SELECT
  TO authenticated
  USING (public.user_in_order(order_id));

CREATE POLICY "Members can create reports"
  ON public.order_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_in_order(order_id)
    AND reporter_id = auth.uid()
  );

-- Trigger: quando uma denúncia é criada, publica uma mensagem do sistema no chat
CREATE OR REPLACE FUNCTION public.notify_chat_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_chat_messages (order_id, sender_id, sender_role, content)
  VALUES (
    NEW.order_id,
    NULL,
    'sistema',
    '⚠️ Denúncia aberta pelo ' || NEW.reporter_role ||
    '. O suporte da FarmConnect foi notificado e entra agora na conversa para ajudar a resolver a situação. Motivo: ' ||
    NEW.reason
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_chat_on_report
AFTER INSERT ON public.order_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_on_report();

-- =========================================================
-- 3. Limpeza: 5 dias após entrega
-- =========================================================
CREATE OR REPLACE FUNCTION public.delete_old_order_chats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH old_orders AS (
    SELECT id FROM public.orders
    WHERE status = 'delivered'
      AND delivered_at IS NOT NULL
      AND delivered_at < now() - interval '5 days'
  )
  DELETE FROM public.order_chat_messages
  WHERE order_id IN (SELECT id FROM old_orders);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM public.order_reports
  WHERE order_id IN (
    SELECT id FROM public.orders
    WHERE status = 'delivered'
      AND delivered_at IS NOT NULL
      AND delivered_at < now() - interval '5 days'
  );

  RETURN deleted_count;
END;
$$;

-- =========================================================
-- 4. Storage bucket privado para anexos e provas
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Path esperado: <order_id>/<uuid>.<ext>
CREATE POLICY "Members read order attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'order-attachments'
    AND public.user_in_order(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Members upload order attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'order-attachments'
    AND public.user_in_order(((storage.foldername(name))[1])::uuid)
    AND owner = auth.uid()
  );