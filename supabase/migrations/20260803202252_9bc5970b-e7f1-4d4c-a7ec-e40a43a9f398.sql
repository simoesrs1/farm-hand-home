ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discount_percent integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD CONSTRAINT products_discount_percent_range CHECK (discount_percent >= 0 AND discount_percent <= 90);