
-- 1. Restrict profile UPDATE so users cannot change profile_type
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND profile_type = (SELECT p.profile_type FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2. Tighten chat INSERT: sender_role must match the user's actual profile_type
DROP POLICY IF EXISTS "Members can send order chat" ON public.order_chat_messages;
CREATE POLICY "Members can send order chat"
ON public.order_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  public.user_in_order(order_id)
  AND sender_id = auth.uid()
  AND sender_role = (
    CASE (SELECT p.profile_type FROM public.profiles p WHERE p.id = auth.uid())
      WHEN 'vendedor' THEN 'agricultor'
      WHEN 'cliente' THEN 'cliente'
    END
  )
);

-- 3. Expand user_in_order to also cover the payment phase so chat works end-to-end
CREATE OR REPLACE FUNCTION public.user_in_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND (
        o.client_id = auth.uid()
        OR public.user_owns_farmer(o.farmer_id)
      )
      AND o.status IN ('pending_payment','awaiting_pickup','delivered','expired')
  );
$$;

-- 4. Realtime RLS: restrict chat channel subscriptions to order participants
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order chat channel subscribers only" ON realtime.messages;
CREATE POLICY "Order chat channel subscribers only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'chat:%' THEN
      public.user_in_order(
        NULLIF(substring(realtime.topic() FROM 6), '')::uuid
      )
    ELSE true
  END
);

-- 5. order-attachments DELETE policy (owners only)
DROP POLICY IF EXISTS "Members delete own order attachments" ON storage.objects;
CREATE POLICY "Members delete own order attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-attachments'
  AND owner = auth.uid()
  AND public.user_in_order(((storage.foldername(name))[1])::uuid)
);
