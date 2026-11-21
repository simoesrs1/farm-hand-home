import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { isFarmerManagementPath, useFarmerStatus } from "@/hooks/useFarmerStatus";
import i18n from "@/i18n";

/**
 * Agricultores sem os dados da exploração (registo por completar) podem
 * explorar a aplicação ("Preencher mais tarde"), mas não a área de venda:
 * ao abrir uma página de gestão (/agricultor/produtos, encomendas, …) vão
 * para /onboarding/agricultor. O perfil público /agricultor/:id fica livre.
 */
const FarmerOnboardingGuard = () => {
  const { isFarmer, loading, registered } = useFarmerStatus();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isFarmer || loading || registered) return;
    if (!isFarmerManagementPath(pathname)) return;
    toast({
      title: i18n.t("farmer:status.completeTitle"),
      description: i18n.t("farmer:status.completeText"),
    });
    navigate("/onboarding/agricultor", { replace: true });
  }, [isFarmer, loading, registered, pathname, navigate]);

  return null;
};

export default FarmerOnboardingGuard;
