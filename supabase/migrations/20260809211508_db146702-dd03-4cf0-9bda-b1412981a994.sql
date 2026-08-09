ALTER TABLE public.farmer_details
  ADD COLUMN IF NOT EXISTS pickup_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pickup_hours_note text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 6;