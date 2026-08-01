import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Bloqueia agricultores que ainda não completaram o registo (passo 2)
 * forçando a navegação para /onboarding/agricultor em qualquer outra rota.
 * Permite o /auth para casos de re-login.
 */
const FarmerOnboardingGuard = () => {
  const { user, profile, loading, activeMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (profile.profile_type !== "vendedor") return;
    // No modo cliente o agricultor navega livremente (só precisa do email verificado)
    if (activeMode !== "vendedor") return;

    const allowedRoutes = ["/onboarding/agricultor", "/auth"];
    if (allowedRoutes.includes(location.pathname)) return;


    let cancelled = false;
    setChecking(true);
    (async () => {
      const { data } = await supabase
        .from("farmer_details")
        .select("registration_step")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!data || data.registration_step < 2) {
        navigate("/onboarding/agricultor", { replace: true });
      }
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profile, loading, location.pathname, navigate]);

  return null;
};

export default FarmerOnboardingGuard;
