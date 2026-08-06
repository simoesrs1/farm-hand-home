ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';

CREATE OR REPLACE FUNCTION public.category_slug(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _name
    WHEN 'Bebidas' THEN 'bebidas'
    WHEN 'Carne' THEN 'carne'
    WHEN 'Cereais' THEN 'cereais'
    WHEN 'Charcutaria' THEN 'charcutaria'
    WHEN 'Cogumelos' THEN 'cogumelos'
    WHEN 'Conservas' THEN 'conservas'
    WHEN 'Ervas aromáticas' THEN 'ervas-aromaticas'
    WHEN 'Flores' THEN 'flores'
    WHEN 'Fruta' THEN 'fruta'
    WHEN 'Frutos Secos' THEN 'frutos-secos'
    WHEN 'Gorduras' THEN 'gorduras'
    WHEN 'Halófitas' THEN 'halofitas'
    WHEN 'Hortícolas' THEN 'horticolas'
    WHEN 'Laticínios' THEN 'laticinios'
    WHEN 'Leguminosas' THEN 'leguminosas'
    WHEN 'Mel' THEN 'mel'
    WHEN 'Óleos essenciais' THEN 'oleos-essenciais'
    WHEN 'Outros produtos' THEN 'outros-produtos'
    WHEN 'Ovos' THEN 'ovos'
    WHEN 'Pão artesanal' THEN 'pao-artesanal'
    WHEN 'Salgados' THEN 'salgados'
    WHEN 'Temperos e especiarias' THEN 'temperos-e-especiarias'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.notify_favorites_on_product_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_title text;
  v_message text;
  v_farm text;
  v_slug text;
  v_link text;
BEGIN
  IF NOT NEW.active THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.stock_quantity, 0) <= 0 THEN RETURN NEW; END IF;
    v_type := 'favorite_new_product';
  ELSE
    IF COALESCE(OLD.stock_quantity, 0) <= 0 AND COALESCE(NEW.stock_quantity, 0) > 0 THEN
      v_type := 'favorite_restock';
    ELSIF COALESCE(NEW.discount_percent, 0) > COALESCE(OLD.discount_percent, 0)
      AND COALESCE(NEW.discount_percent, 0) > 0 THEN
      v_type := 'favorite_promo';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  SELECT COALESCE(NULLIF(company_name, ''), 'um agricultor favorito')
    INTO v_farm FROM public.farmer_details WHERE id = NEW.farmer_id;

  v_slug := public.category_slug(NEW.category);
  v_link := CASE WHEN v_slug IS NULL THEN '/catalogo' ELSE '/catalogo/' || v_slug END
            || '?produto=' || NEW.id::text;

  IF v_type = 'favorite_restock' THEN
    v_title := 'Disponível outra vez';
    v_message := NEW.name || ' de ' || v_farm || ' voltou a ter stock disponível.';
  ELSIF v_type = 'favorite_promo' THEN
    v_title := 'Nova promoção';
    v_message := v_farm || ' colocou ' || NEW.name || ' com ' || COALESCE(NEW.discount_percent, 0)::text || '% de desconto.';
  ELSE
    v_title := 'Novidade de um favorito';
    v_message := v_farm || ' adicionou um novo produto: ' || NEW.name || '.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT f.user_id, v_type, v_title, v_message, v_link
  FROM public.favorites f
  WHERE f.farmer_slug = NEW.farmer_id::text;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_favorites_product_insert ON public.products;
CREATE TRIGGER trg_notify_favorites_product_insert
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_favorites_on_product_event();

DROP TRIGGER IF EXISTS trg_notify_favorites_product_update ON public.products;
CREATE TRIGGER trg_notify_favorites_product_update
AFTER UPDATE OF stock_quantity, discount_percent, active ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_favorites_on_product_event();

REVOKE EXECUTE ON FUNCTION public.category_slug(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_favorites_on_product_event() FROM anon, authenticated;