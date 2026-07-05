
-- 1. Enforce reporter_role from actual profile on order_reports
DROP POLICY IF EXISTS "Members can create reports" ON public.order_reports;
CREATE POLICY "Members can create reports"
  ON public.order_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_in_order(order_id)
    AND reporter_id = auth.uid()
    AND reporter_role = (
      CASE (SELECT p.profile_type FROM public.profiles p WHERE p.id = auth.uid())
        WHEN 'vendedor' THEN 'agricultor'
        WHEN 'cliente' THEN 'cliente'
      END
    )
  );

-- 2. Add file-type restrictions to storage INSERT policies
DROP POLICY IF EXISTS "Members upload order attachments" ON storage.objects;
CREATE POLICY "Members upload order attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'order-attachments'
    AND public.user_in_order(((storage.foldername(name))[1])::uuid)
    AND owner = auth.uid()
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','gif','webp','pdf'])
  );

DROP POLICY IF EXISTS "Farmer can upload own product media" ON storage.objects;
CREATE POLICY "Farmer can upload own product media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-media'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','gif','webp','mp4','webm','mov'])
  );

DROP POLICY IF EXISTS "Farmer can upload own change-request docs" ON storage.objects;
CREATE POLICY "Farmer can upload own change-request docs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'change-request-docs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','gif','webp','pdf'])
  );

-- 3. Revoke EXECUTE on SECURITY DEFINER helpers from anon/public
REVOKE EXECUTE ON FUNCTION public.farmer_is_verified(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lock_farmer_on_change_request() FROM PUBLIC, anon;
