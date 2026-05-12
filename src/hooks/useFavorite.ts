import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
        title: "Inicie sessão",
        description: "Precisa de iniciar sessão para guardar favoritos.",
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
        toast({ title: "Removido dos favoritos" });
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, farmer_slug: farmerSlug });
      if (!error) {
        setIsFavorite(true);
        toast({
          title: `${farmName ?? "Quinta"} adicionada aos favoritos`,
          description: "Será notificado sobre renovação de disponibilidade e novos produtos.",
        });
      }
    }
    setLoading(false);
  }, [user, isFavorite, farmerSlug, farmName, toast]);

  return { isFavorite, toggle, loading };
};
