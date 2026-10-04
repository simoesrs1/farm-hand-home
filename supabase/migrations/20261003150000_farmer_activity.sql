-- Sistema de atividade dos agricultores (só incentivos).
--
-- Uma pontuação diária (0–100) mede a atividade dos últimos 30 dias a partir
-- de dados que já existem: alterações ao catálogo (product_history), rapidez
-- a aceitar encomendas (orders) e respostas no chat (order_chat_messages).
-- A pontuação serve para ordenar o catálogo e escolher os agricultores em
-- destaque na página inicial — nunca para ocultar ninguém.
--
-- Agricultores em pausa voluntária (farmer_details.paused_until) ou com todos
-- os produtos fora de época ficam isentos: a pontuação fica congelada.
--
-- compute_farmer_activity() é chamada diariamente pela edge function
-- farmer-activity (service_role).

-- ---------------------------------------------------------------------------
-- 1. Data de hoje em Portugal (current_date seria UTC)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.today_lisbon()
RETURNS date
LANGUAGE sql STABLE
AS $$ SELECT (now() AT TIME ZONE 'Europe/Lisbon')::date $$;

GRANT EXECUTE ON FUNCTION public.today_lisbon() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Pausa voluntária
-- ---------------------------------------------------------------------------
-- paused_until é a data de REGRESSO: o agricultor está em pausa enquanto
-- today_lisbon() < paused_until e volta a estar visível nesse dia, sem
-- precisar de nenhum job.
ALTER TABLE public.farmer_details
  ADD COLUMN IF NOT EXISTS paused_until date,
  ADD COLUMN IF NOT EXISTS pause_note text;

ALTER TABLE public.farmer_details
  DROP CONSTRAINT IF EXISTS farmer_details_pause_note_len;
ALTER TABLE public.farmer_details
  ADD CONSTRAINT farmer_details_pause_note_len CHECK (char_length(pause_note) <= 280);

-- farmer_details usa permissões por coluna (ver 20260723120000).
GRANT SELECT (paused_until, pause_note) ON public.farmer_details TO anon, authenticated;
GRANT UPDATE (paused_until, pause_note) ON public.farmer_details TO authenticated;

-- A data de regresso tem de ser futura e no máximo a ~6 meses.
CREATE OR REPLACE FUNCTION public.validate_farmer_pause()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.paused_until IS DISTINCT FROM OLD.paused_until AND NEW.paused_until IS NOT NULL THEN
    IF NEW.paused_until <= public.today_lisbon() THEN
      RAISE EXCEPTION 'A data de regresso tem de ser posterior a hoje.';
    END IF;
    IF NEW.paused_until > public.today_lisbon() + 183 THEN
      RAISE EXCEPTION 'A pausa não pode ultrapassar 6 meses.';
    END IF;
  END IF;
  IF NEW.paused_until IS NULL THEN
    NEW.pause_note := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_farmer_pause() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_farmer_pause ON public.farmer_details;
CREATE TRIGGER trg_validate_farmer_pause
BEFORE UPDATE OF paused_until, pause_note ON public.farmer_details
FOR EACH ROW EXECUTE FUNCTION public.validate_farmer_pause();

-- Produtos de agricultores em pausa deixam de aparecer no catálogo.
CREATE OR REPLACE FUNCTION public.farmer_is_listed(_farmer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT verification_status = 'verified'
            AND (paused_until IS NULL OR paused_until <= public.today_lisbon())
       FROM public.farmer_details WHERE id = _farmer_id),
    false
  );
$$;

-- Avaliada dentro da policy com os privilégios de quem consulta
-- (ver 20260722183000), por isso anon e authenticated precisam de EXECUTE.
GRANT EXECUTE ON FUNCTION public.farmer_is_listed(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (
  (active = true AND public.farmer_is_listed(farmer_id))
  OR public.user_owns_farmer(farmer_id)
);

-- ---------------------------------------------------------------------------
-- 3. Tabela de atividade
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farmer_activity (
  farmer_id uuid PRIMARY KEY REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  score smallint NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  level text NOT NULL DEFAULT 'semente'
    CHECK (level IN ('semente', 'rebento', 'colheita', 'pomar')),
  -- Nível no cálculo anterior, para detetar subidas de nível.
  previous_level text,
  -- Detalhe por componente, usado no painel e nos lembretes.
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_action_at timestamptz,
  streak_weeks smallint NOT NULL DEFAULT 0,
  exempt_reason text CHECK (exempt_reason IN ('paused', 'off_season')),
  -- Posição (1–6) nos destaques da página inicial; null fora do top.
  featured_rank smallint,
  featured_since timestamptz,
  last_nudge_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.farmer_activity ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.farmer_activity TO authenticated;
GRANT ALL ON public.farmer_activity TO service_role;

DROP POLICY IF EXISTS "Farmer can view own activity" ON public.farmer_activity;
CREATE POLICY "Farmer can view own activity"
  ON public.farmer_activity FOR SELECT TO authenticated
  USING (public.user_owns_farmer(farmer_id));
-- Sem políticas de escrita: só compute_farmer_activity() e o service_role escrevem.

CREATE INDEX IF NOT EXISTS product_history_farmer_idx
  ON public.product_history (farmer_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Cálculo diário
-- ---------------------------------------------------------------------------
-- Componentes (peso):
--   catálogo (40)   — dias desde a última alteração feita pelo próprio
--                     agricultor (≤7 → 1, ≥45 → 0) × 0,75 + % de produtos
--                     ativos com stock × 0,25
--   encomendas (40) — mediana do tempo de resposta (≤2 h → 1, ≥48 h → 0) × 0,7
--                     + taxa de encomendas não canceladas por falta de stock × 0,3
--   chat (20)       — % de mensagens de clientes respondidas em 24 h
-- Uma componente sem dados (sem encomendas, sem mensagens) é neutra: o seu
-- peso é redistribuído pelas restantes.
CREATE OR REPLACE FUNCTION public.compute_farmer_activity()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := public.today_lisbon();
  v_since timestamptz := now() - interval '30 days';
  v_count integer;
BEGIN
  WITH f AS (
    SELECT fd.id AS farmer_id, fd.user_id, fd.paused_until, fd.initial_score,
           fd.verification_status
      FROM public.farmer_details fd
     WHERE fd.registration_step = 2
  ),
  prod AS (
    SELECT p.farmer_id,
           count(*) FILTER (WHERE p.active) AS active_count,
           count(*) FILTER (WHERE p.active AND COALESCE(p.stock_quantity, 0) > 0) AS in_stock_count,
           count(*) FILTER (
             WHERE p.active
               AND (p.availability_start IS NULL OR p.availability_start <= v_today)
               AND (p.availability_end IS NULL OR p.availability_end >= v_today)
           ) AS in_season_count,
           count(*) FILTER (
             WHERE p.active AND COALESCE(p.stock_quantity, 0) > 0
               AND (p.availability_start IS NULL OR p.availability_start <= v_today)
               AND (p.availability_end IS NULL OR p.availability_end >= v_today)
           ) AS sellable_count,
           max(p.created_at) AS last_created
      FROM public.products p
     GROUP BY p.farmer_id
  ),
  -- Ações do próprio agricultor (as vendas são automáticas e não contam).
  hist AS (
    SELECT h.farmer_id, max(h.created_at) AS last_edit,
           count(*) FILTER (WHERE h.created_at >= v_since) AS edits_30d
      FROM public.product_history h
      JOIN f ON f.farmer_id = h.farmer_id
     WHERE h.event_type <> 'sale' AND h.actor_id = f.user_id
     GROUP BY h.farmer_id
  ),
  ord AS (
    SELECT o.farmer_id,
           count(*) AS total,
           count(*) FILTER (WHERE o.status = 'refunded') AS refunded,
           count(*) FILTER (WHERE o.status = 'awaiting_pickup' AND o.accepted_at IS NULL) AS pending,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY extract(epoch FROM (
               COALESCE(o.accepted_at, o.delivered_at, o.expired_at, now()) - o.created_at
             )) / 3600.0
           ) FILTER (WHERE o.status <> 'refunded') AS median_hours,
           max(o.accepted_at) AS last_accept
      FROM public.orders o
     WHERE o.created_at >= v_since AND o.status <> 'pending_payment'
     GROUP BY o.farmer_id
  ),
  -- Só contam mensagens com mais de 24 h (as recentes ainda podem ser respondidas).
  chat AS (
    SELECT o.farmer_id,
           count(*) AS client_msgs,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM public.order_chat_messages r
              WHERE r.order_id = m.order_id
                AND r.sender_role = 'agricultor'
                AND r.created_at > m.created_at
                AND r.created_at <= m.created_at + interval '24 hours'
           )) AS answered
      FROM public.order_chat_messages m
      JOIN public.orders o ON o.id = m.order_id
     WHERE m.sender_role = 'cliente'
       AND m.created_at >= v_since
       AND m.created_at <= now() - interval '24 hours'
     GROUP BY o.farmer_id
  ),
  last_reply AS (
    SELECT o.farmer_id, max(m.created_at) AS last_msg
      FROM public.order_chat_messages m
      JOIN public.orders o ON o.id = m.order_id
     WHERE m.sender_role = 'agricultor'
     GROUP BY o.farmer_id
  ),
  -- Semanas (ISO) com pelo menos uma ação, no último ano.
  acts AS (
    SELECT DISTINCT farmer_id, date_trunc('week', ts) AS wk FROM (
      SELECT h.farmer_id, h.created_at AS ts
        FROM public.product_history h JOIN f ON f.farmer_id = h.farmer_id
       WHERE h.event_type <> 'sale' AND h.actor_id = f.user_id
      UNION ALL
      SELECT o.farmer_id, o.accepted_at FROM public.orders o WHERE o.accepted_at IS NOT NULL
      UNION ALL
      SELECT p.farmer_id, p.created_at FROM public.products p
    ) a
    WHERE ts >= now() - interval '52 weeks'
  ),
  -- Semanas consecutivas partilham a mesma âncora (gaps-and-islands).
  islands AS (
    SELECT farmer_id,
           wk + (row_number() OVER (PARTITION BY farmer_id ORDER BY wk DESC) - 1) * interval '1 week' AS anchor
      FROM acts
  ),
  streak AS (
    SELECT i.farmer_id, count(*)::smallint AS weeks
      FROM islands i
     WHERE i.anchor = (SELECT max(j.anchor) FROM islands j WHERE j.farmer_id = i.farmer_id)
       AND i.anchor >= date_trunc('week', now()) - interval '1 week'
     GROUP BY i.farmer_id
  ),
  parts AS (
    SELECT f.farmer_id, f.paused_until, f.initial_score, f.verification_status,
           COALESCE(prod.active_count, 0) AS active_count,
           COALESCE(prod.in_stock_count, 0) AS in_stock_count,
           COALESCE(prod.in_season_count, 0) AS in_season_count,
           COALESCE(prod.sellable_count, 0) AS sellable_count,
           GREATEST(hist.last_edit, prod.last_created) AS last_catalog,
           COALESCE(hist.edits_30d, 0) AS edits_30d,
           ord.total AS orders_total, ord.refunded AS orders_refunded,
           COALESCE(ord.pending, 0) AS orders_pending, ord.median_hours,
           chat.client_msgs, chat.answered,
           GREATEST(hist.last_edit, prod.last_created, ord.last_accept, last_reply.last_msg) AS last_action_at,
           COALESCE(streak.weeks, 0) AS streak_weeks
      FROM f
      LEFT JOIN prod ON prod.farmer_id = f.farmer_id
      LEFT JOIN hist ON hist.farmer_id = f.farmer_id
      LEFT JOIN ord ON ord.farmer_id = f.farmer_id
      LEFT JOIN chat ON chat.farmer_id = f.farmer_id
      LEFT JOIN last_reply ON last_reply.farmer_id = f.farmer_id
      LEFT JOIN streak ON streak.farmer_id = f.farmer_id
  ),
  scored AS (
    SELECT p.*,
           CASE WHEN p.last_catalog IS NULL THEN NULL
                ELSE extract(epoch FROM now() - p.last_catalog) / 86400.0 END AS days_since_update,
           -- catálogo: sempre avaliado (sem produtos = 0)
           CASE WHEN p.last_catalog IS NULL THEN 0
                ELSE 0.75 * LEAST(1, GREATEST(0, (45 - extract(epoch FROM now() - p.last_catalog) / 86400.0) / 38.0))
                   + 0.25 * CASE WHEN p.active_count > 0 THEN p.in_stock_count::numeric / p.active_count ELSE 0 END
           END AS s_catalog,
           CASE WHEN COALESCE(p.orders_total, 0) = 0 THEN NULL
                ELSE 0.7 * CASE WHEN p.median_hours IS NULL THEN 1
                                ELSE LEAST(1, GREATEST(0, (48 - p.median_hours) / 46.0)) END
                   + 0.3 * (1 - p.orders_refunded::numeric / p.orders_total)
           END AS s_orders,
           CASE WHEN COALESCE(p.client_msgs, 0) = 0 THEN NULL
                ELSE p.answered::numeric / p.client_msgs END AS s_chat,
           CASE WHEN p.paused_until IS NOT NULL AND p.paused_until > v_today THEN 'paused'
                WHEN p.active_count > 0 AND p.in_season_count = 0 THEN 'off_season'
           END AS exempt_reason
      FROM parts p
  ),
  final AS (
    SELECT s.*,
           round(100 * (
             40 * s.s_catalog + COALESCE(40 * s.s_orders, 0) + COALESCE(20 * s.s_chat, 0)
           ) / (40 + CASE WHEN s.s_orders IS NULL THEN 0 ELSE 40 END
                   + CASE WHEN s.s_chat IS NULL THEN 0 ELSE 20 END))::smallint AS score
      FROM scored s
  )
  INSERT INTO public.farmer_activity AS fa
    (farmer_id, score, level, components, last_action_at, streak_weeks, exempt_reason, computed_at)
  SELECT farmer_id,
         score,
         CASE WHEN score >= 90 THEN 'pomar' WHEN score >= 70 THEN 'colheita'
              WHEN score >= 40 THEN 'rebento' ELSE 'semente' END,
         jsonb_build_object(
           'catalog', jsonb_build_object(
             'score', round(s_catalog * 100),
             'days_since_update', round(days_since_update),
             'active_products', active_count,
             'in_stock_products', in_stock_count,
             'sellable_products', sellable_count,
             'edits_30d', edits_30d),
           'orders', jsonb_build_object(
             'score', round(s_orders * 100),
             'total', COALESCE(orders_total, 0),
             'refunded', COALESCE(orders_refunded, 0),
             'pending', orders_pending,
             'median_hours', round(median_hours::numeric, 1)),
           'chat', jsonb_build_object(
             'score', round(s_chat * 100),
             'client_messages', COALESCE(client_msgs, 0),
             'answered', COALESCE(answered, 0))
         ),
         last_action_at, streak_weeks, exempt_reason, now()
    FROM final
  ON CONFLICT (farmer_id) DO UPDATE SET
    previous_level = fa.level,
    -- Isento (pausa / fora de época): a pontuação fica congelada.
    score = CASE WHEN EXCLUDED.exempt_reason IS NULL THEN EXCLUDED.score ELSE fa.score END,
    level = CASE WHEN EXCLUDED.exempt_reason IS NULL THEN EXCLUDED.level ELSE fa.level END,
    components = CASE WHEN EXCLUDED.exempt_reason IS NULL THEN EXCLUDED.components ELSE fa.components END,
    streak_weeks = CASE WHEN EXCLUDED.exempt_reason IS NULL THEN EXCLUDED.streak_weeks ELSE fa.streak_weeks END,
    last_action_at = EXCLUDED.last_action_at,
    exempt_reason = EXCLUDED.exempt_reason,
    computed_at = EXCLUDED.computed_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Destaques da página inicial: top 6 por atividade + certificados, entre
  -- agricultores verificados, não pausados, com algo à venda hoje e com pelo
  -- menos nível Rebento (≥ 40) — os certificados sozinhos não chegam para
  -- destacar um agricultor parado.
  WITH eligible AS (
    SELECT fa.farmer_id,
           row_number() OVER (
             ORDER BY fa.score + COALESCE(fd.initial_score, 0) DESC, fa.last_action_at DESC NULLS LAST
           ) AS rnk
      FROM public.farmer_activity fa
      JOIN public.farmer_details fd ON fd.id = fa.farmer_id
     WHERE fd.registration_step = 2
       AND fd.verification_status = 'verified'
       AND fa.score >= 40
       AND (fd.paused_until IS NULL OR fd.paused_until <= v_today)
       AND EXISTS (
         SELECT 1 FROM public.products p
          WHERE p.farmer_id = fa.farmer_id AND p.active AND COALESCE(p.stock_quantity, 0) > 0
            AND (p.availability_start IS NULL OR p.availability_start <= v_today)
            AND (p.availability_end IS NULL OR p.availability_end >= v_today)
       )
  )
  UPDATE public.farmer_activity fa SET
    featured_rank = CASE WHEN e.rnk <= 6 THEN e.rnk END,
    featured_since = CASE
      WHEN e.rnk <= 6 THEN COALESCE(fa.featured_since, now())
      ELSE NULL END
    FROM (
      SELECT fa2.farmer_id, e2.rnk
        FROM public.farmer_activity fa2
        LEFT JOIN eligible e2 ON e2.farmer_id = fa2.farmer_id
    ) e
   WHERE e.farmer_id = fa.farmer_id;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_farmer_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_farmer_activity() TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Vista pública: pontuação, destaque e pausa
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.public_farmer_profiles;
CREATE VIEW public.public_farmer_profiles
WITH (security_invoker = off) AS
 SELECT fd.id,
    fd.user_id,
    fd.company_name,
    fd.cae_code,
    fd.address,
    fd.website,
    fd.description,
    fd.initial_score,
    fd.registration_step,
    fd.created_at,
    fd.updated_at,
    fd.pickup_address,
    fd.pickup_lat,
    fd.pickup_lng,
    fd.pickup_hours,
    fd.pickup_hours_note,
    fd.delivery_radius_km,
    fd.delivery_hours,
    fd.delivery_note,
    fd.paused_until,
    fd.pause_note,
    COALESCE(fa.score, 0)::integer AS activity_score,
    fa.featured_rank::integer AS featured_rank
   FROM public.farmer_details fd
   LEFT JOIN public.farmer_activity fa ON fa.farmer_id = fd.id
  WHERE fd.registration_step = 2;

GRANT SELECT ON public.public_farmer_profiles TO anon, authenticated, service_role;

-- Primeira execução, para o catálogo e os destaques não ficarem vazios até ao cron.
SELECT public.compute_farmer_activity();
