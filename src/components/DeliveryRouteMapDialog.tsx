import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Loader2, Map as MapIcon, MapPin, Navigation, Route as RouteIcon, Undo2 } from "lucide-react";
import MapConsentGate from "@/components/MapConsentGate";
import { useConsent } from "@/contexts/ConsentContext";
import { formatKm } from "@/lib/geo";
import type { RouteDay, RouteFarm } from "@/hooks/useDeliveryRoute";


export interface RouteControlsProps {
  farm: RouteFarm | null;
  /** Ordem mais curta a partir da quinta (true) ou pela hora marcada (false). */
  optimized: boolean;
  onOptimizedChange: (value: boolean) => void;
  returnToOrigin: boolean;
  onReturnToOriginChange: (value: boolean) => void;
}

interface Props extends RouteControlsProps {
  /** Entregas por dia, já pela ordem do percurso (ver useDeliveryRoute). */
  days: RouteDay[];
  /** Conteúdo extra mostrado por baixo do mapa (ex.: lista das encomendas). */
  children?: ReactNode;
}

// O Google Maps não lê os tokens CSS: hex equivalentes à paleta (src/index.css).
// Todas as cores têm contraste suficiente para o número branco do marcador.
const DAY_COLORS = [
  "#BA2E1C", // tomate (--primary)
  "#14532D", // couve (--kale)
  "#1B4F98", // azul (--info)
  "#914D08", // âmbar (--warning)
  "#6B2FB3", // beringela
  "#0F766E", // verde-água
  "#C2410C", // laranja-escuro
];
const MAP_INK = "#1C1A17"; // --foreground
const MAP_PAPER = "#FFF4E2"; // --background
const MAP_MUTED = "#696159"; // --muted-foreground

const formatTime = (d: Date) => d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

const formatMinutes = (min: number) => {
  const total = Math.max(1, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
};

/** Botão "Organizar rota" e opção de regresso à quinta (no diálogo e na lista de planeamento). */
export const DeliveryRouteControls = ({
  farm,
  optimized,
  onOptimizedChange,
  returnToOrigin,
  onReturnToOriginChange,
}: RouteControlsProps) => {
  const switchId = useId();
  if (!farm) {
    return (
      <p className="text-xs text-muted-foreground">
        Para organizar a rota, marca a localização da quinta em{" "}
        <Link to="/agricultor/disponibilidade" className="font-medium text-primary underline-offset-2 hover:underline">
          Disponibilidade
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button
        size="sm"
        variant={optimized ? "outline" : "default"}
        className="gap-1.5"
        onClick={() => onOptimizedChange(!optimized)}
      >
        {optimized ? <Undo2 className="h-4 w-4" /> : <RouteIcon className="h-4 w-4" />}
        {optimized ? "Ordenar por hora" : "Organizar rota"}
      </Button>
      <div className="flex items-center gap-2">
        <Switch id={switchId} checked={returnToOrigin} onCheckedChange={onReturnToOriginChange} />
        <Label htmlFor={switchId} className="text-sm font-normal text-foreground">
          Voltar à quinta no fim
        </Label>
      </div>
    </div>
  );
};

/** Km do dia e links para seguir o percurso no Google Maps. */
export const RouteDaySummary = ({ day }: { day: RouteDay }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
    {day.road ? (
      <span className="font-medium text-foreground">
        {formatKm(day.road.distanceKm)} · {formatMinutes(day.road.durationMin)} por estrada
      </span>
    ) : day.roadLoading ? (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> A calcular o percurso por estrada…
      </span>
    ) : (
      day.totalKm != null && <span className="text-muted-foreground">≈ {formatKm(day.totalKm)} em linha reta</span>
    )}
    {day.roadError && !day.road && (
      <span className="text-muted-foreground" title={day.roadError}>
        (percurso por estrada indisponível)
      </span>
    )}
    {day.mapsUrls.map((url, i) => (
      <a
        key={url}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Abrir no Google Maps{day.mapsUrls.length > 1 ? ` (parte ${i + 1})` : ""}
      </a>
    ))}
  </div>
);

// Mapa do percurso: a quinta como origem, um marcador numerado por entrega,
// agrupado por dia, pela ordem recebida (por hora ou organizada).
const DeliveryRouteMapDialog = ({ days, children, ...controls }: Props) => {
  const { farm, optimized, returnToOrigin } = controls;
  const [open, setOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapsAllowed = useConsent().hasConsent("maps");
  const hasStops = days.some((d) => d.stops.length > 0);

  useEffect(() => {
    if (!open || !mapsAllowed || !hasStops) return;
    const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    if (!browserKey) return;

    const renderMap = () => {
      if (!mapRef.current || !window.google?.maps) return;
      const firstStop = days[0]?.stops[0];
      const center = farm ?? (firstStop ? { lat: firstStop.lat, lng: firstStop.lng } : { lat: 39.5, lng: -8.0 });
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        clickableIcons: false,
      });
      const bounds = new window.google.maps.LatLngBounds();

      if (farm) {
        new window.google.maps.Marker({
          position: farm,
          map,
          title: farm.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: MAP_INK,
            fillOpacity: 1,
            strokeColor: MAP_PAPER,
            strokeWeight: 2,
          },
        });
        bounds.extend(farm);
      }

      // Conteúdo do balão com nós DOM e textContent: a morada vem do cliente e nunca é lida como HTML.
      const infoContent = (s: RouteDay["stops"][number]) => {
        const box = document.createElement("div");
        box.style.cssText = `font-family:'Schibsted Grotesk',system-ui;max-width:220px;color:${MAP_INK};`;
        const title = document.createElement("strong");
        title.textContent = s.label;
        const address = document.createElement("div");
        address.style.cssText = `color:${MAP_MUTED};font-size:12px;margin-top:2px;`;
        address.textContent = s.address ?? "Morada por confirmar";
        const extra = document.createElement("div");
        extra.style.cssText = "font-size:12px;margin-top:2px;";
        extra.textContent = `${formatTime(s.when)}${s.km != null ? ` · ${formatKm(s.km)}` : ""}`;
        box.append(title, address, extra);
        return box;
      };

      days.forEach((day, dayIndex) => {
        const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
        const path: { lat: number; lng: number }[] = farm ? [farm] : [];
        day.stops.forEach((s, i) => {
          const marker = new window.google.maps.Marker({
            position: { lat: s.lat, lng: s.lng },
            map,
            title: s.label,
            label: { text: String(i + 1), color: "#ffffff", fontSize: "12px" },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: MAP_PAPER,
              strokeWeight: 2,
            },
          });
          const info = new window.google.maps.InfoWindow({ content: infoContent(s) });
          marker.addListener("click", () => info.open({ anchor: marker, map }));
          bounds.extend({ lat: s.lat, lng: s.lng });
          path.push({ lat: s.lat, lng: s.lng });
        });
        if (farm && returnToOrigin && day.stops.length > 0) path.push(farm);
        if (day.road && day.road.path.length > 1) {
          // Trajeto real por estrada (OpenRouteService).
          const roadPath = day.road.path.map(([lat, lng]) => ({ lat, lng }));
          roadPath.forEach((p) => bounds.extend(p));
          new window.google.maps.Polyline({
            path: roadPath,
            map,
            strokeColor: color,
            strokeOpacity: 0.85,
            strokeWeight: 4,
          });
        } else if (path.length > 1) {
          // Estimativa em linha reta.
          new window.google.maps.Polyline({
            path,
            map,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.7,
            strokeWeight: 3,
          });
        }
      });

      if (!bounds.isEmpty()) map.fitBounds(bounds, 60);
    };

    if (window.google?.maps) {
      renderMap();
      return;
    }
    window.__initDeliveryRouteMap = renderMap;
    if (document.getElementById("gmaps-sdk")) return;
    const script = document.createElement("script");
    script.id = "gmaps-sdk";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=__initDeliveryRouteMap`;
    document.head.appendChild(script);
  }, [open, farm, days, returnToOrigin, mapsAllowed, hasStops]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MapIcon className="h-4 w-4" />
          Entregas ao domicílio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Entregas ao domicílio
          </DialogTitle>
        </DialogHeader>

        {!hasStops ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ainda não há entregas ativas com ponto de entrega marcado pelo cliente.
          </p>
        ) : (
          <>
            <DeliveryRouteControls {...controls} />
            <MapConsentGate className="h-[400px]">
              <div ref={mapRef} className="h-[400px] w-full rounded-lg border border-border bg-muted" />
            </MapConsentGate>
            <div className="mt-4 max-h-72 space-y-4 overflow-y-auto">
              {days.map((day, dayIndex) => (
                <div key={day.key}>
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: DAY_COLORS[dayIndex % DAY_COLORS.length] }}
                    />
                    {day.date.toLocaleDateString("pt-PT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <div className="mt-1">
                    <RouteDaySummary day={day} />
                  </div>
                  <ul className="mt-2 space-y-1">
                    {day.stops.map((s, i) => (
                      <li
                        key={s.orderId}
                        className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {i + 1}
                        </span>
                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                        <span className="flex-1 truncate text-foreground">
                          {s.address ?? s.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatTime(s.when)}</span>
                        {s.km != null && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {formatKm(s.km)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {optimized
                ? "Ordem organizada pelo percurso mais rápido por estrada a partir da tua quinta. Se o cálculo por estrada falhar, usa-se a distância em linha reta."
                : "Ordem pela hora marcada, com distâncias em linha reta. Usa \"Organizar rota\" para obter o percurso mais rápido por estrada a partir da tua quinta."}
            </p>
            {days.some((d) => d.road) && (
              <p className="text-[11px] text-muted-foreground">
                {/* Texto exigido pelos termos da HeiGIT (https://account.heigit.org/info/tos). */}
                © openrouteservice by HeiGIT | Data from{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                >
                  OpenStreetMap
                </a>
              </p>
            )}
          </>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryRouteMapDialog;
