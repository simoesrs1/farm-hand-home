import { useEffect, useMemo, useRef, useState } from "react";
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
  const [map, setMap] = useState<GMaps>(null);
  const markers = useRef<Record<string, GMaps>>({});
  const circle = useRef<GMaps>(null);
  const centerMarker = useRef<GMaps>(null);
  const mapsAllowed = useConsent().hasConsent("maps");
  const { data: farmers = [], isLoading } = useQuery({
    queryKey: ["map-farmers"],
    queryFn: fetchMapFarmers,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const [farms, setFarms] = useState<FarmPoint[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(false);
  const [center, setCenter] = useState<SearchCenter | null>(null);
  const [radius, setRadius] = useState(RADIUS_DEFAULT);
  const [locating, setLocating] = useState(false);

  // Agricultores reais com ponto de levantamento (os de demonstração não entram).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingFarms(true);
    supabase
      .from("public_farmer_profiles")
      .select("id, company_name, address, pickup_lat, pickup_lng")
      .not("pickup_lat", "is", null)
      .not("pickup_lng", "is", null)
      .then(({ data }) => {
        if (cancelled) return;
        setFarms(
          (data ?? []).map((f) => ({
            id: f.id as string,
            name: f.company_name ?? "Quinta",
            address: f.address,
            lat: Number(f.pickup_lat),
            lng: Number(f.pickup_lng),
          })),
        );
        setLoadingFarms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Lista: dentro do raio por distância; sem centro, todos por ordem alfabética.
  const listed = useMemo(
    () =>
      center
        ? withinRadius(farms, center, radius)
        : [...farms].sort((a, b) => a.name.localeCompare(b.name, "pt")).map((f) => ({ ...f, distance: null as number | null })),
    [farms, center, radius],
  );
  const insideIds = useMemo(() => new Set(listed.map((f) => f.id)), [listed]);

  // Google Maps: carrega o SDK e cria o mapa quando o diálogo abre.
  useEffect(() => {
    if (!open || !mapsAllowed) return;
    const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    if (!browserKey) {
      console.warn("VITE_GOOGLE_MAPS_BROWSER_KEY não definida — o mapa não será carregado.");
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
      const instance = new window.google.maps.Map(mapRef.current, {
        center: PORTUGAL_CENTER,
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
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
      setMap(instance);
    };
    if (window.google?.maps) {
      renderMap();
      return;
    }
    window.__initValorRuralMap = renderMap;
    if (document.getElementById("gmaps-sdk")) return;
    const script = document.createElement("script");
    script.id = "gmaps-sdk";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=__initValorRuralMap`;
    document.head.appendChild(script);
  }, [open, mapsAllowed, farmers, navigate]);

  // Ao fechar, o mapa e os marcadores são descartados (o DOM do diálogo desaparece).
  useEffect(() => {
    if (open) return;
    Object.values(markers.current).forEach((m) => m.setMap(null));
    markers.current = {};
    circle.current?.setMap(null);
    circle.current = null;
    centerMarker.current?.setMap(null);
    centerMarker.current = null;
    setMap(null);
  }, [open]);

  // Marcadores dos agricultores. O conteúdo do balão é criado como DOM, sem HTML
  // vindo da base de dados.
  useEffect(() => {
    if (!map) return;
    Object.values(markers.current).forEach((m) => m.setMap(null));
    markers.current = {};
    const info = new window.google.maps.InfoWindow();
    for (const f of farms) {
      const marker = new window.google.maps.Marker({ position: { lat: f.lat, lng: f.lng }, map, title: f.name });
      marker.addListener("click", () => {
        const box = document.createElement("div");
        box.style.cssText = "font-family: system-ui; max-width: 220px;";
        const title = document.createElement("strong");
        title.textContent = f.name;
        box.appendChild(title);
        if (f.address) {
          const addr = document.createElement("div");
          addr.style.cssText = "color:#555;font-size:12px;margin-top:2px;";
          addr.textContent = f.address;
          box.appendChild(addr);
        }
        const link = document.createElement("a");
        link.href = `/agricultor/${f.id}`;
        link.textContent = "Ver perfil →";
        link.style.cssText = "color:#2d6a4f;font-size:12px;display:inline-block;margin-top:4px;";
        link.addEventListener("click", (ev) => {
          ev.preventDefault();
          setOpen(false);
          navigate(`/agricultor/${f.id}`);
        });
        box.appendChild(link);
        info.setContent(box);
        info.open({ anchor: marker, map });
      });
      markers.current[f.id] = marker;
    }
  }, [map, farms, navigate]);

  // Círculo do raio, centro e destaque de quem está dentro.
  useEffect(() => {
    if (!map) return;
    for (const [id, marker] of Object.entries(markers.current)) marker.setOpacity(insideIds.has(id) ? 1 : 0.35);
    if (!center) {
      circle.current?.setMap(null);
      circle.current = null;
      centerMarker.current?.setMap(null);
      centerMarker.current = null;
      return;
    }
    if (!circle.current) {
      circle.current = new window.google.maps.Circle({
        map,
        strokeColor: "#2d6a4f",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#2d6a4f",
        fillOpacity: 0.08,
        clickable: false,
      });
    }
    circle.current.setCenter(center);
    circle.current.setRadius(radius * 1000);
    if (!centerMarker.current) {
      centerMarker.current = new window.google.maps.Marker({
        map,
        clickable: false,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#1d4ed8",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    }
    centerMarker.current.setPosition(center);
    map.fitBounds(circle.current.getBounds());
  }, [map, center, radius, insideIds]);

  const locateMe = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: "Localização indisponível", description: "Este navegador não permite obter a localização.", variant: "destructive" });
      return;
    }
    setLocating(true);
    // A localização fica só no navegador, para este filtro; não é guardada nem enviada.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "A sua localização" });
      },
      (err) => {
        setLocating(false);
        toast({
          title: "Não foi possível obter a localização",
          description:
            err.code === err.PERMISSION_DENIED
              ? "A autorização foi recusada. Pode escolher um distrito ou clicar no mapa."
              : "Tente de novo, escolha um distrito ou clique no mapa.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Map className="h-4 w-4" />
          Ver mapa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agricultores perto de si</DialogTitle>
          <DialogDescription>Escolha onde procurar e o raio, à direita. Também pode clicar no mapa.</DialogDescription>
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
