
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity numeric,
  ADD COLUMN IF NOT EXISTS availability_start date,
  ADD COLUMN IF NOT EXISTS availability_end date;
