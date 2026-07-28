
-- pickup_address/pickup_lat/pickup_lng (added in 20260618234316) and
-- verification_status (added in 20260619001146) were never added to the
-- column-level SELECT grants set up in 20260512093728, which locked
-- public.farmer_details down to an explicit column allowlist per role. Any
-- SELECT naming these columns (e.g. FarmerInfo.tsx's own-profile query, or
-- the farmer:farmer_id(...) joins in MyOrders.tsx/RateFarmer.tsx) fails with
-- "permission denied for table farmer_details" even though RLS would allow
-- the row.
GRANT SELECT (pickup_address, pickup_lat, pickup_lng)
  ON public.farmer_details TO anon, authenticated;

-- verification_status is only read by the farmer viewing their own profile;
-- keep it out of the anon-safe column set (mirrors company_nif/phone/etc.).
GRANT SELECT (verification_status)
  ON public.farmer_details TO authenticated;
