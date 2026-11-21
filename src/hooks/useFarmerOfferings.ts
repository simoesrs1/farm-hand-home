import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OFFERING_COLUMNS, OFFERINGS_CHANGED_EVENT, offeringsFromRow, type Offerings } from "@/lib/farmer-offerings";

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
      .select(OFFERING_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    setOfferings(data ? offeringsFromRow(data) : null);
  }, [userId]);

  useEffect(() => {
    load();
    window.addEventListener(OFFERINGS_CHANGED_EVENT, load);
    return () => window.removeEventListener(OFFERINGS_CHANGED_EVENT, load);
  }, [load]);

  return offerings;
};
