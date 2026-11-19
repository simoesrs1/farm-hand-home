import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import i18n from "@/i18n";

export const useFavorite = (farmerSlug: string, farmName?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("farmer_slug", farmerSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsFavorite(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user, farmerSlug]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast({
        title: i18n.t("cart:toast.login"),
        description: i18n.t("account:favorites.loginText"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("farmer_slug", farmerSlug);
      if (!error) {
        setIsFavorite(false);
        toast({ title: i18n.t("account:favorites.removed") });
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, farmer_slug: farmerSlug });
      if (!error) {
        setIsFavorite(true);
        toast({
          title: i18n.t("account:favorites.added", { farm: farmName ?? i18n.t("offerings:listings.farmFallback") }),
          description: i18n.t("account:favorites.addedText"),
        });
      }
    }
    setLoading(false);
  }, [user, isFavorite, farmerSlug, farmName, toast]);

  return { isFavorite, toggle, loading };
};
