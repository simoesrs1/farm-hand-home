-- Status enum
CREATE TYPE public.order_status AS ENUM ('pending_payment', 'awaiting_pickup', 'delivered', 'expired');

-- Add pickup days to farmer_details
ALTER TABLE public.farmer_details
ADD COLUMN pickup_days INTEGER NOT NULL DEFAULT 7 CHECK (pickup_days BETWEEN 1 AND 30);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  farmer_id UUID NOT NULL REFERENCES public.farmer_details(id) ON DELETE RESTRICT,
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  commission_amount NUMERIC(10,2) NOT NULL CHECK (commission_amount >= 0),
  farmer_amount NUMERIC(10,2) NOT NULL CHECK (farmer_amount >= 0),
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  pickup_code TEXT NOT NULL UNIQUE,
  pickup_deadline TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_farmer ON public.orders(farmer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_pickup_code ON public.orders(pickup_code);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_image TEXT,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  unit TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- Updated_at trigger
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper: is user the farmer that owns this farmer_details row?
CREATE OR REPLACE FUNCTION public.user_owns_farmer(_farmer_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farmer_details
    WHERE id = _farmer_id AND user_id = auth.uid()
  )
$$;

-- ORDERS policies
CREATE POLICY "Clients view own orders"
ON public.orders FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Farmers view their farm orders"
ON public.orders FOR SELECT
USING (public.user_owns_farmer(farmer_id));

-- No INSERT/UPDATE/DELETE policies → only service role (edge functions) can mutate

-- ORDER ITEMS policies
CREATE POLICY "Clients view own order items"
ON public.order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id AND o.client_id = auth.uid()
));

CREATE POLICY "Farmers view their order items"
ON public.order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id AND public.user_owns_farmer(o.farmer_id)
));

-- NOTIFICATIONS policies
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications read"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);