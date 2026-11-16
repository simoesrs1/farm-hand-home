import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Map, MapPin } from "lucide-react";
import MapConsentGate from "@/components/MapConsentGate";
import { useConsent } from "@/contexts/ConsentContext";
import { supabase } from "@/integrations/supabase/client";
import { isPaused } from "@/lib/farmer-activity";

declare global {
  interface Window {
    google: any;
    __initValorRuralMap?: () => void;
  }
}

interface MapFarmer {
  id: string;
  farm: string;
  place: string;
  lat: number;
  lng: number;
}

// Hex equivalentes aos tokens (o Google Maps não lê CSS): tinta, cinzento quente e tomate.
const MAP_INK = "#1C1A17";
const MAP_MUTED = "#696159";
const MAP_PRIMARY = "#BA2E1C";

/** Agricultores com local de recolha definido (a vista pública já expõe estas coordenadas). */
const fetchMapFarmers = async (): Promise<MapFarmer[]> => {
  const { data } = await supabase
    .from("public_farmer_profiles")
    .select("id, company_name, pickup_address, address, pickup_lat, pickup_lng, paused_until")
    .not("pickup_lat", "is", null)
    .not("pickup_lng", "is", null);
  return (data ?? [])
    .filter((f) => f.id && !isPaused(f.paused_until))
    .map((f) => ({
      id: f.id as string,
      farm: f.company_name ?? "Quinta",
      place: f.pickup_address ?? f.address ?? "",
      lat: f.pickup_lat as number,
      lng: f.pickup_lng as number,
    }));
};

const PortugalMapDialog = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const mapsAllowed = useConsent().hasConsent("maps");
  const { data: farmers = [], isLoading } = useQuery({
    queryKey: ["map-farmers"],
    queryFn: fetchMapFarmers,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open || !mapsAllowed) return;

    const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    if (!browserKey) {
      console.warn(
        "VITE_GOOGLE_MAPS_BROWSER_KEY não definida — o mapa não será carregado.",
      );
      return;
    }

    const goToFarmer = (id: string) => {
      setOpen(false);
      navigate(`/agricultor/${id}`);
    };

    // Conteúdo da janela construído com nós DOM e textContent: os dados nunca são lidos como HTML.
    const infoContent = (f: MapFarmer) => {
      const box = document.createElement("div");
      box.style.cssText = `font-family:'Schibsted Grotesk',system-ui;max-width:200px;color:${MAP_INK};`;
      const name = document.createElement("strong");
      name.textContent = f.farm;
      const place = document.createElement("div");
      place.style.cssText = `color:${MAP_MUTED};font-size:12px;margin-top:2px;`;
      place.textContent = f.place;
      const link = document.createElement("a");
      link.href = `/agricultor/${f.id}`;
      link.textContent = "Ver perfil →";
      link.style.cssText = `display:inline-block;margin-top:4px;color:${MAP_PRIMARY};font-size:12px;`;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        goToFarmer(f.id);
      });
      box.append(name, place, link);
      return box;
    };

    const renderMap = () => {
      if (!mapRef.current || !window.google?.maps) return;
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 39.5, lng: -8.0 },
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      farmers.forEach((f) => {
        const marker = new window.google.maps.Marker({
          position: { lat: f.lat, lng: f.lng },
          map: mapInstance.current,
          title: f.farm,
        });
        const info = new window.google.maps.InfoWindow({ content: infoContent(f) });
        marker.addListener("click", () => {
          info.open({ anchor: marker, map: mapInstance.current });
        });
      });
    };

    if (window.google?.maps) {
      renderMap();
      return;
    }

    window.__initValorRuralMap = renderMap;

    const existing = document.getElementById("gmaps-sdk");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "gmaps-sdk";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=__initValorRuralMap`;
    document.head.appendChild(script);
  }, [open, mapsAllowed, farmers, navigate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Map className="h-4 w-4" />
          Ver mapa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agricultores em Portugal</DialogTitle>
        </DialogHeader>
        <MapConsentGate className="h-[420px]">
          <div ref={mapRef} className="h-[420px] w-full rounded-lg border border-border bg-muted" />
        </MapConsentGate>
        <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar agricultores…
            </p>
          ) : farmers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há agricultores com local de recolha no mapa.</p>
          ) : (
            farmers.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(`/agricultor/${f.id}`);
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium text-foreground">{f.farm}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{f.place}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortugalMapDialog;
