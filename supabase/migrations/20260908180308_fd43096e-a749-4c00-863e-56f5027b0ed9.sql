ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS local_delivery boolean NOT NULL DEFAULT false;

ALTER TABLE public.farmer_details
  ADD COLUMN IF NOT EXISTS delivery_radius_km numeric,
  ADD COLUMN IF NOT EXISTS delivery_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_note text;

GRANT SELECT (delivery_radius_km, delivery_hours, delivery_note) ON public.farmer_details TO authenticated, anon;
GRANT UPDATE (delivery_radius_km, delivery_hours, delivery_note) ON public.farmer_details TO authenticated;
GRANT SELECT (local_delivery) ON public.products TO authenticated, anon;
GRANT INSERT (local_delivery), UPDATE (local_delivery) ON public.products TO authenticated;