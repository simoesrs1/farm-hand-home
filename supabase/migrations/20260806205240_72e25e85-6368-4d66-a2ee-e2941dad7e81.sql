ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

CREATE OR REPLACE FUNCTION public.notify_farmer_on_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_old numeric := COALESCE(OLD.stock_quantity, 0);
  v_new numeric := COALESCE(NEW.stock_quantity, 0);
  v_threshold numeric := GREATEST(COALESCE(NEW.low_stock_threshold, 5), 0);
BEGIN
  IF NEW.active IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF v_new = v_old THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id FROM public.farmer_details WHERE id = NEW.farmer_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_new <= 0 AND v_old > 0 THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      v_user_id,
      'out_of_stock',
      'Stock esgotado',
      'O produto "' || NEW.name || '" ficou sem stock. Repõe o stock para voltar a estar visível no catálogo.'
    );
  ELSIF v_new > 0 AND v_new <= v_threshold AND v_old > v_threshold THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      v_user_id,
      'low_stock',
      'Stock quase a acabar',
      'O produto "' || NEW.name || '" tem apenas ' || v_new::text || ' unidade(s) em stock (limite definido: ' || v_threshold::text || ').'
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_farmer_on_low_stock() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_farmer_on_low_stock ON public.products;
CREATE TRIGGER trg_notify_farmer_on_low_stock
AFTER UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_farmer_on_low_stock();