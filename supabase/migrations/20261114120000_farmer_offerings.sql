-- O que o agricultor disponibiliza: produtos, experiências e/ou alojamento.
--
-- Escolhido no primeiro registo e alterável em Informações da exploração, sem
-- pedido de alteração. Os agricultores que já existem ficam só com produtos.
-- Para desligar uma opção:
--   * produtos: nenhum produto ativo pode ter stock à venda;
--   * experiências / alojamento: todas as atividades suspensas (inativas).
-- As reservas já feitas mantêm-se e têm de ser cumpridas pelo agricultor.

ALTER TABLE public.farmer_details
  ADD COLUMN IF NOT EXISTS offers_products boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS offers_experiences boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offers_stays boolean NOT NULL DEFAULT false;

ALTER TABLE public.farmer_details
  ADD CONSTRAINT farmer_details_offers_at_least_one
  CHECK (offers_products OR offers_experiences OR offers_stays);

GRANT SELECT (offers_products, offers_experiences, offers_stays) ON public.farmer_details TO anon, authenticated;
GRANT UPDATE (offers_products, offers_experiences, offers_stays) ON public.farmer_details TO authenticated;

CREATE OR REPLACE FUNCTION public.check_farmer_offerings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.offers_products AND NOT NEW.offers_products AND EXISTS (
    SELECT 1 FROM public.products WHERE farmer_id = NEW.id AND active AND COALESCE(stock_quantity, 0) > 0
  ) THEN
    RAISE EXCEPTION 'Para deixar de vender produtos, termine primeiro o stock dos produtos à venda.';
  END IF;
  IF OLD.offers_experiences AND NOT NEW.offers_experiences AND EXISTS (
    SELECT 1 FROM public.farm_experiences WHERE farmer_id = NEW.id AND active
  ) THEN
    RAISE EXCEPTION 'Para deixar de oferecer experiências, suspenda primeiro todas as experiências.';
  END IF;
  IF OLD.offers_stays AND NOT NEW.offers_stays AND EXISTS (
    SELECT 1 FROM public.farm_stays WHERE farmer_id = NEW.id AND active
  ) THEN
    RAISE EXCEPTION 'Para deixar de oferecer alojamento, suspenda primeiro todos os alojamentos.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_farmer_offerings_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_check_farmer_offerings_change
BEFORE UPDATE OF offers_products, offers_experiences, offers_stays ON public.farmer_details
FOR EACH ROW EXECUTE FUNCTION public.check_farmer_offerings_change();
