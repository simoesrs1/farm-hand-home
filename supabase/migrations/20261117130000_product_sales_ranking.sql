-- Ordenação "Mais vendidos" na página de categoria.
--
-- O histórico de produtos (product_history) só é visível ao próprio agricultor.
-- Esta função devolve apenas o total de unidades vendidas por produto nos
-- últimos 90 dias (eventos 'sale'), para produtos ativos. Não expõe encomendas,
-- clientes nem valores.

CREATE OR REPLACE FUNCTION public.product_sales_counts(p_product_ids uuid[])
RETURNS TABLE (product_id uuid, units_sold numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.product_id, COALESCE(SUM(-h.quantity_delta), 0) AS units_sold
    FROM public.product_history h
    JOIN public.products p ON p.id = h.product_id
   WHERE h.product_id = ANY (p_product_ids[1:500])
     AND h.event_type = 'sale'
     AND h.quantity_delta < 0
     AND h.created_at >= now() - interval '90 days'
     AND p.active
   GROUP BY h.product_id;
$$;

REVOKE ALL ON FUNCTION public.product_sales_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_sales_counts(uuid[]) TO anon, authenticated, service_role;
