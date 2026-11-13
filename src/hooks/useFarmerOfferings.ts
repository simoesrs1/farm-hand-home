import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OFFERINGS_CHANGED_EVENT, type Offerings } from "@/lib/farmer-offerings";

/** Escolhas do agricultor com sessão iniciada (null enquanto carrega ou sem registo). */
export const useFarmerOfferings = (userId: string | null | undefined) => {
  const [offerings, setOfferings] = useState<Offerings | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setOfferings(null);
      return;
    }
    const { data } = await supabase
      .from("farmer_details")
      .select("offers_products, offers_experiences, offers_stays")
      .eq("user_id", userId)
      .maybeSingle();
    setOfferings(
      data ? { products: data.offers_products, experiences: data.offers_experiences, stays: data.offers_stays } : null,
    );
  }, [userId]);

  useEffect(() => {
    load();
    window.addEventListener(OFFERINGS_CHANGED_EVENT, load);
    return () => window.removeEventListener(OFFERINGS_CHANGED_EVENT, load);
  }, [load]);

  return offerings;
};
