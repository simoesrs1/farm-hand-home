import { ReactNode } from "react";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/contexts/ConsentContext";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** Classes de tamanho/forma do espaço reservado (iguais às do mapa). */
  className?: string;
}

/**
 * O Google Maps só é carregado depois de o utilizador autorizar a categoria
 * "Mapas". Até lá, mostra um espaço reservado com a opção de ativar.
 */
const MapConsentGate = ({ children, className }: Props) => {
  const { hasConsent, grant, openPreferences } = useConsent();

  if (hasConsent("maps")) return <>{children}</>;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted p-6 text-center",
        className,
      )}
    >
      <MapPinOff className="h-8 w-8 text-muted-foreground" />
      <div className="max-w-sm">
        <p className="text-sm font-medium text-foreground">Mapa desativado</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Os mapas são fornecidos pela Google, que pode definir cookies e recolher o seu endereço
          IP. Para ver o mapa, autorize os cookies de mapas.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" onClick={() => grant("maps")}>
          Ativar mapas
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={openPreferences}>
          Preferências
        </Button>
      </div>
    </div>
  );
};

export default MapConsentGate;
