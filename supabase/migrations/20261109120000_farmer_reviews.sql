-- Avaliações de agricultores, pedidos de eliminação e queixas por entrega não recebida.
--
-- Avaliações: uma por encomenda, escrita só através de submit_farmer_review.
-- Pode avaliar quem recebeu a encomenda, quem a viu cancelada pelo agricultor
-- ou quem, numa entrega ao domicílio, continua sem a receber 24 h depois da
-- data prevista. A avaliação não se altera; a eliminação é pedida com
-- justificação e decidida pela equipa.
--
-- Queixas: numa entrega atrasada, o cliente regista a queixa e o agricultor tem
-- 48 h para entregar. Depois disso, a equipa confirma que o cliente não recebeu
-- e aprova a devolução. Não há área de administração: a equipa decide mudando
-- `status` nestas tabelas (ver docs/avaliacoes-e-queixas.md); os triggers tratam
-- do resto.

-- As policies de delivery_complaints chamam esta função.
GRANT EXECUTE ON FUNCTION public.user_in_order(uuid) TO authenticated;

-- 1. Data prevista de entrega (preenchida em create-order). NULL nas encomendas
-- antigas, que usam pickup_deadline.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expected_delivery_at timestamptz;

GRANT SELECT (expected_delivery_at) ON public.orders TO authenticated;


-- 2. Avaliações.
CREATE TABLE public.farmer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  -- Primeiro nome e inicial do apelido, gravados no momento da avaliação.
  reviewer_name text NOT NULL,
  context text NOT NULL CHECK (context IN ('delivered', 'cancelled', 'late')),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_farmer_reviews_farmer ON public.farmer_reviews (farmer_id, created_at DESC);

ALTER TABLE public.farmer_reviews ENABLE ROW LEVEL SECURITY;

-- Leitura pública sem order_id nem client_id; sem escrita direta.
GRANT SELECT (id, farmer_id, rating, comment, reviewer_name, context, removed_at, created_at)
  ON public.farmer_reviews TO anon, authenticated;
GRANT ALL ON public.farmer_reviews TO service_role;

CREATE POLICY "Anyone can read published reviews"
  ON public.farmer_reviews FOR SELECT TO anon, authenticated
  USING (removed_at IS NULL);


-- 3. Pedidos de eliminação de avaliações.
CREATE TABLE public.review_removal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.farmer_reviews(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  justification text NOT NULL CHECK (char_length(justification) BETWEEN 20 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE UNIQUE INDEX uq_review_removal_pending
  ON public.review_removal_requests (review_id) WHERE status = 'pending';

ALTER TABLE public.review_removal_requests ENABLE ROW LEVEL SECURITY;

-- Sem policies para os utilizadores: passa tudo pelas funções abaixo.
GRANT ALL ON public.review_removal_requests TO service_role;


-- 4. Queixas por entrega não recebida.
CREATE TABLE public.delivery_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'delivered', 'refund_approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Fim das 48 h que o agricultor tem para entregar.
  deadline_at timestamptz NOT NULL,
  decided_at timestamptz
);

ALTER TABLE public.delivery_complaints ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.delivery_complaints TO authenticated;
GRANT ALL ON public.delivery_complaints TO service_role;

CREATE POLICY "Order members can read complaints"
  ON public.delivery_complaints FOR SELECT TO authenticated
  USING (public.user_in_order(order_id));


-- 5. Regras. A mesma regra está em src/lib/review-eligibility.ts, para a
-- interface mostrar os botões certos; a que conta é esta.
CREATE OR REPLACE FUNCTION public.order_review_context(
  p_status public.order_status,
  p_delivery_address text,
  p_expected_delivery_at timestamptz,
  p_pickup_deadline timestamptz
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_status = 'delivered' THEN 'delivered'
    WHEN p_status = 'refunded' THEN 'cancelled'
    WHEN p_status IN ('awaiting_pickup', 'expired')
         AND p_delivery_address IS NOT NULL
         AND now() > COALESCE(p_expected_delivery_at, p_pickup_deadline) + interval '24 hours'
      THEN 'late'
  END
$$;

CREATE OR REPLACE FUNCTION public.reviewer_display_name(p_full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_parts text[];
  v_count integer;
BEGIN
  IF p_full_name IS NULL OR btrim(p_full_name) = '' THEN
    RETURN 'Cliente';
  END IF;
  v_parts := regexp_split_to_array(btrim(p_full_name), '\s+');
  v_count := array_length(v_parts, 1);
  IF v_count = 1 THEN
    RETURN v_parts[1];
  END IF;
  RETURN v_parts[1] || ' ' || upper(left(v_parts[v_count], 1)) || '.';
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_farmer_review(
  p_order_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_context text;
  v_name text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Escolhe uma avaliação de 1 a 5 estrelas.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.client_id <> v_user THEN
    RAISE EXCEPTION 'Encomenda não encontrada.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.farmer_reviews WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Esta encomenda já foi avaliada.';
  END IF;

  v_context := public.order_review_context(
    v_order.status, v_order.delivery_address, v_order.expected_delivery_at, v_order.pickup_deadline
  );
  IF v_context IS NULL THEN
    RAISE EXCEPTION 'Esta encomenda ainda não pode ser avaliada.';
  END IF;

  SELECT public.reviewer_display_name(full_name) INTO v_name
    FROM public.profiles WHERE id = v_user;

  INSERT INTO public.farmer_reviews (order_id, farmer_id, client_id, rating, comment, reviewer_name, context)
  VALUES (
    p_order_id, v_order.farmer_id, v_user, p_rating,
    NULLIF(btrim(left(COALESCE(p_comment, ''), 1000)), ''),
    COALESCE(v_name, 'Cliente'), v_context
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Estado das avaliações do próprio cliente (a tabela não expõe order_id).
CREATE OR REPLACE FUNCTION public.my_order_reviews()
RETURNS TABLE (order_id uuid, review_id uuid, removed boolean, removal_status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.order_id, r.id, r.removed_at IS NOT NULL,
         (SELECT q.status FROM public.review_removal_requests q
           WHERE q.review_id = r.id ORDER BY q.created_at DESC LIMIT 1)
    FROM public.farmer_reviews r
   WHERE r.client_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.request_review_removal(p_review_id uuid, p_justification text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_text text := btrim(COALESCE(p_justification, ''));
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF char_length(v_text) NOT BETWEEN 20 AND 1000 THEN
    RAISE EXCEPTION 'A justificação tem de ter entre 20 e 1000 caracteres.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.farmer_reviews
     WHERE id = p_review_id AND client_id = v_user AND removed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Avaliação não encontrada.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.review_removal_requests
     WHERE review_id = p_review_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Já existe um pedido em análise para esta avaliação.';
  END IF;

  INSERT INTO public.review_removal_requests (review_id, client_id, justification)
  VALUES (p_review_id, v_user, v_text)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.file_delivery_complaint(p_order_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_farmer_user uuid;
  v_deadline timestamptz := now() + interval '48 hours';
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.client_id <> v_user THEN
    RAISE EXCEPTION 'Encomenda não encontrada.';
  END IF;
  IF v_order.status <> 'awaiting_pickup'
     OR public.order_review_context(
          v_order.status, v_order.delivery_address, v_order.expected_delivery_at, v_order.pickup_deadline
        ) IS DISTINCT FROM 'late' THEN
    RAISE EXCEPTION 'Só podes registar uma queixa 24 horas depois da data prevista de entrega.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.delivery_complaints WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Já existe uma queixa para esta encomenda.';
  END IF;

  INSERT INTO public.delivery_complaints (order_id, client_id, deadline_at)
  VALUES (p_order_id, v_user, v_deadline);

  SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_order.farmer_id;
  IF v_farmer_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (
      v_farmer_user, p_order_id, 'delivery_complaint', 'Queixa de entrega não recebida',
      'Um cliente indicou que não recebeu a encomenda. Tens 48 horas para a entregar e validar o QR code.',
      '/agricultor/encomendas?id=' || p_order_id::text
    );
  END IF;
  RETURN v_deadline;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.order_review_context(public.order_status, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reviewer_display_name(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_farmer_review(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_farmer_review(uuid, integer, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_order_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_order_reviews() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_review_removal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_review_removal(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.file_delivery_complaint(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_delivery_complaint(uuid) TO authenticated;


-- 6. Decisões da equipa.
CREATE OR REPLACE FUNCTION public.on_review_removal_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Este pedido já foi decidido.';
  END IF;
  NEW.decided_at := now();

  IF NEW.status = 'approved' THEN
    UPDATE public.farmer_reviews SET removed_at = now() WHERE id = NEW.review_id;
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.client_id, 'review_removal_approved', 'Avaliação eliminada',
            'O teu pedido foi aceite e a avaliação foi eliminada.', '/encomendas');
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.client_id, 'review_removal_rejected', 'Pedido de eliminação recusado',
            'Analisámos o teu pedido e a avaliação vai manter-se publicada.', '/encomendas');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_removal_decision
BEFORE UPDATE OF status ON public.review_removal_requests
FOR EACH ROW EXECUTE FUNCTION public.on_review_removal_decision();

CREATE OR REPLACE FUNCTION public.on_delivery_complaint_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_farmer_user uuid;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'Esta queixa já foi decidida.';
  END IF;
  NEW.decided_at := now();

  IF NEW.status = 'refund_approved' THEN
    IF now() < OLD.deadline_at THEN
      RAISE EXCEPTION 'As 48 horas do agricultor ainda não terminaram.';
    END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
    IF v_order.status <> 'awaiting_pickup' THEN
      RAISE EXCEPTION 'A encomenda já não está por entregar.';
    END IF;
    UPDATE public.orders SET status = 'refunded', expired_at = now() WHERE id = NEW.order_id;

    SELECT user_id INTO v_farmer_user FROM public.farmer_details WHERE id = v_order.farmer_id;
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (NEW.client_id, NEW.order_id, 'order_refunded', 'Encomenda devolvida',
            'Confirmámos que não recebeste a encomenda. O valor de '
              || to_char(v_order.total, 'FM999990.00') || '€ foi devolvido na totalidade.',
            '/encomendas?id=' || NEW.order_id::text);
    IF v_farmer_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
      VALUES (v_farmer_user, NEW.order_id, 'order_refunded', 'Encomenda devolvida ao cliente',
              'A encomenda não foi entregue no prazo da queixa e o valor foi devolvido ao cliente.',
              '/agricultor/encomendas?id=' || NEW.order_id::text);
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message, link)
    VALUES (NEW.client_id, NEW.order_id, 'delivery_complaint_rejected', 'Queixa recusada',
            'Analisámos a tua queixa e não foi possível confirmar que a encomenda não foi entregue.',
            '/encomendas?id=' || NEW.order_id::text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_delivery_complaint_decision
BEFORE UPDATE OF status ON public.delivery_complaints
FOR EACH ROW EXECUTE FUNCTION public.on_delivery_complaint_decision();

-- QR code validado: a queixa em aberto fecha sozinha.
CREATE OR REPLACE FUNCTION public.close_complaint_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    UPDATE public.delivery_complaints SET status = 'delivered'
     WHERE order_id = NEW.id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_close_complaint_on_delivery
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.close_complaint_on_delivery();

REVOKE EXECUTE ON FUNCTION public.on_review_removal_decision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_delivery_complaint_decision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.close_complaint_on_delivery() FROM PUBLIC, anon, authenticated;


-- 7. Mensagem do chat: ainda não há aviso automático à equipa.
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
    '. Ficou registada para análise da equipa da ValorRural. Motivo: ' ||
    NEW.reason
  );
  RETURN NEW;
END;
$$;
