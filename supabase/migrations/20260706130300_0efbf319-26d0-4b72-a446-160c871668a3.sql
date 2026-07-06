DROP POLICY IF EXISTS "Order chat channel subscribers only" ON realtime.messages;
CREATE POLICY "Order chat channel subscribers only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'chat:%' THEN public.user_in_order(NULLIF(substring(realtime.topic() FROM 6), '')::uuid)
    ELSE false
  END
);