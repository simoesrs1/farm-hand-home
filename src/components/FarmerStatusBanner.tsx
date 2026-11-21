import { Link, useLocation } from "react-router-dom";
import { Clock, ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useFarmerStatus } from "@/hooks/useFarmerStatus";

/**
 * Aviso fixo para o agricultor que ainda não pode vender: sem os dados da
 * exploração ("Completar dados") ou à espera da verificação pela equipa
 * (pode preparar produtos, experiências e alojamento, mas não aparecem).
 */
const FarmerStatusBanner = () => {
  const { isFarmer, loading, registered, status } = useFarmerStatus();
  const { t } = useTranslation("farmer");
  const { pathname } = useLocation();

  if (!isFarmer || loading || pathname === "/onboarding/agricultor") return null;

  if (!registered) {
    return (
      <div role="status" className="border-b border-warning/30 bg-warning/10">
        <div className="container flex flex-wrap items-center gap-x-3 gap-y-2 py-2 text-sm text-foreground">
          <ClipboardList className="h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="flex-1">{t("status.incomplete")}</p>
          <Button asChild size="sm" variant="outline" className="h-8">
            <Link to="/onboarding/agricultor">{t("status.completeButton")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === "unverified") {
    return (
      <div role="status" className="border-b border-border bg-muted/50">
        <div className="container flex items-center gap-3 py-2 text-sm text-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>{t("status.unverified")}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default FarmerStatusBanner;
