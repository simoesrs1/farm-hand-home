-- A migração 20260512093728 retirou o EXECUTE ao authenticated e nunca foi reposto
-- (no Lovable foi reposto fora das migrações). As policies RLS de products, orders,
-- order_items, product_stock_batches, product_history, farmer_activity e
-- farmer_change_requests chamam esta função, incluindo para visitantes (anon).
-- É segura para anon: só devolve true quando auth.uid() é o dono do agricultor.
GRANT EXECUTE ON FUNCTION public.user_owns_farmer(uuid) TO authenticated, anon;
