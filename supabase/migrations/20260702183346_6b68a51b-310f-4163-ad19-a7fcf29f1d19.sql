
DO $$ BEGIN
  CREATE TYPE public.delivery_mode AS ENUM ('pickup', 'shipping', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_mode public.delivery_mode NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS shipping_days integer;
