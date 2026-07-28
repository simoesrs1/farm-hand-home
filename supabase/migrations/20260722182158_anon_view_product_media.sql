
-- Product rows are already visible to anonymous visitors (see "Anyone can view
-- active products" on public.products), but product photos live in the
-- private product-media bucket, whose SELECT policy only covered
-- "authenticated". That meant every unauthenticated catalog/search/farmer
-- profile view fell back to a placeholder image instead of the real photo.
CREATE POLICY "Anyone can view product media"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'product-media');
