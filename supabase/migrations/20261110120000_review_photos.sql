-- Fotografia de perfil nas avaliações.
--
-- A fotografia é carregada no perfil (bucket público `avatars`, pasta do próprio
-- utilizador) e profiles.avatar_url guarda o caminho no bucket. Só aparece numa
-- avaliação com autorização do cliente, que pode ser retirada a qualquer momento.
-- Guarda-se o caminho, e não um URL, para nunca mostrar numa página pública uma
-- imagem alojada noutro site.

-- 1. Bucket e permissões: leitura pública pelo URL, escrita só na própria pasta.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own avatar objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
  );

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);


-- 2. Avaliações. show_photo guarda a autorização e não é público.
ALTER TABLE public.farmer_reviews
  ADD COLUMN IF NOT EXISTS show_photo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewer_photo_path text;

GRANT SELECT (reviewer_photo_path) ON public.farmer_reviews TO anon, authenticated;


-- 3. Só conta um caminho dentro da pasta do próprio utilizador. Exclui os URLs
-- antigos do campo "URL do avatar".
CREATE OR REPLACE FUNCTION public.is_own_avatar_path(p_user uuid, p_path text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(p_path ~ ('^' || p_user::text || '/[A-Za-z0-9-]+\.(jpg|jpeg|png|webp)$'), false)
$$;

REVOKE EXECUTE ON FUNCTION public.is_own_avatar_path(uuid, text) FROM PUBLIC, anon, authenticated;


-- 4. Submeter avaliação com a autorização. Muda a assinatura, por isso sai a anterior.
DROP FUNCTION public.submit_farmer_review(uuid, integer, text);

CREATE FUNCTION public.submit_farmer_review(
  p_order_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_show_photo boolean DEFAULT false
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
  v_full_name text;
  v_avatar text;
  v_photo text;
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

  SELECT full_name, avatar_url INTO v_full_name, v_avatar
    FROM public.profiles WHERE id = v_user;
  IF COALESCE(p_show_photo, false) AND public.is_own_avatar_path(v_user, v_avatar) THEN
    v_photo := v_avatar;
  END IF;

  INSERT INTO public.farmer_reviews
    (order_id, farmer_id, client_id, rating, comment, reviewer_name, context, show_photo, reviewer_photo_path)
  VALUES (
    p_order_id, v_order.farmer_id, v_user, p_rating,
    NULLIF(btrim(left(COALESCE(p_comment, ''), 1000)), ''),
    public.reviewer_display_name(v_full_name), v_context,
    v_photo IS NOT NULL, v_photo
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_farmer_review(uuid, integer, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_farmer_review(uuid, integer, text, boolean) TO authenticated;


-- 5. Estado das avaliações do cliente, agora com a fotografia.
DROP FUNCTION public.my_order_reviews();

CREATE FUNCTION public.my_order_reviews()
RETURNS TABLE (order_id uuid, review_id uuid, removed boolean, removal_status text, photo_shown boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.order_id, r.id, r.removed_at IS NOT NULL,
         (SELECT q.status FROM public.review_removal_requests q
           WHERE q.review_id = r.id ORDER BY q.created_at DESC LIMIT 1),
         r.show_photo
    FROM public.farmer_reviews r
   WHERE r.client_id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.my_order_reviews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_order_reviews() TO authenticated;


-- 6. Retirar a autorização: efeito imediato e sem análise da equipa.
CREATE OR REPLACE FUNCTION public.hide_review_photo(p_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  UPDATE public.farmer_reviews
     SET show_photo = false, reviewer_photo_path = NULL
   WHERE id = p_review_id AND client_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Avaliação não encontrada.'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.hide_review_photo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hide_review_photo(uuid) TO authenticated;


-- 7. Trocar ou apagar a fotografia no perfil reflete-se nas avaliações autorizadas.
CREATE OR REPLACE FUNCTION public.sync_review_photos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    UPDATE public.farmer_reviews
       SET reviewer_photo_path = CASE
             WHEN public.is_own_avatar_path(NEW.id, NEW.avatar_url) THEN NEW.avatar_url
           END
     WHERE client_id = NEW.id AND show_photo;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_review_photos() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_review_photos
AFTER UPDATE OF avatar_url ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_review_photos();
