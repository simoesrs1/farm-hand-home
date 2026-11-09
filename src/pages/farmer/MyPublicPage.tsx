import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Ver a minha página": reencaminha o agricultor para o seu perfil público
 * (/agricultor/:id), tal como os clientes o veem.
 */
const MyPublicPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("farmer_details")
        .select("id, registration_step")
        .eq("user_id", user.id)
        .maybeSingle();
      // O perfil público só existe com o registo concluído (public_farmer_profiles).
      setFarmerId(data && data.registration_step >= 2 ? data.id : null);
      setChecked(true);
    })();
  }, [user, authLoading, navigate]);

  if (!checked) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Complete o registo de agricultor para ter uma página pública.</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding/agricultor")}>
          Completar perfil
        </Button>
      </div>
    );
  }

  return <Navigate to={`/agricultor/${farmerId}`} replace />;
};

export default MyPublicPage;
