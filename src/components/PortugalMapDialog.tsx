import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Crosshair, Loader2, Map, MapPin, X } from "lucide-react";
import MapConsentGate from "@/components/MapConsentGate";
import { useConsent } from "@/contexts/ConsentContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PT_REGIONS, formatKm, withinRadius, type LatLng } from "@/lib/geo";
import { isPaused } from "@/lib/farmer-activity";



type FarmPoint = LatLng & { id: string; name: string; address: string | null };
type SearchCenter = LatLng & { label: string };

const PORTUGAL_CENTER = { lat: 39.5, lng: -8.0 };
const RADIUS_MIN = 5;
const RADIUS_MAX = 200;
const RADIUS_DEFAULT = 25;

// Hex equivalentes aos tokens (o Google Maps não lê CSS): tinta, cinzento quente e tomate.
const MAP_INK = "#1C1A17";
const MAP_MUTED = "#696159";
const MAP_PRIMARY = "#BA2E1C";

/**
 * "Ver mapa": agricultores reais no seu ponto de levantamento, com pesquisa por
 * raio à volta da localização do aparelho, de um distrito ou de um ponto
 * clicado no mapa. A pesquisa por morada fica para quando a API Places da
 * Google estiver ativa na chave.
 */
const PortugalMapDialog = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markers = useRef<Record<string, google.maps.Marker>>({});
  const circle = useRef<google.maps.Circle | null>(null);
  const centerMarker = useRef<google.maps.Marker | null>(null);
  const mapsAllowed = useConsent().hasConsent("maps");

  const [farms, setFarms] = useState<FarmPoint[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(false);
  const [center, setCenter] = useState<SearchCenter | null>(null);
  const [radius, setRadius] = useState(RADIUS_DEFAULT);
  const [locating, setLocating] = useState(false);

  // Agricultores reais com ponto de levantamento (os de demonstração e os em pausa não entram).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingFarms(true);
    supabase
      .from("public_farmer_profiles")
      .select("id, company_name, pickup_address, address, pickup_lat, pickup_lng, paused_until")
      .not("pickup_lat", "is", null)
      .not("pickup_lng", "is", null)
      .then(({ data }) => {
        if (cancelled) return;
        setFarms(
          (data ?? [])
            .filter((f) => f.id && !isPaused(f.paused_until))
            .map((f) => ({
              id: f.id as string,
              name: f.company_name ?? "Quinta",
              address: f.pickup_address ?? f.address,
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
      instance.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        setCenter({ lat: e.latLng.lat(), lng: e.latLng.lng(), label: "Ponto escolhido no mapa" });
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
  }, [open, mapsAllowed]);

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
        box.style.cssText = `font-family:'Schibsted Grotesk',system-ui;max-width:220px;color:${MAP_INK};`;
        const title = document.createElement("strong");
        title.textContent = f.name;
        box.appendChild(title);
        if (f.address) {
          const addr = document.createElement("div");
          addr.style.cssText = `color:${MAP_MUTED};font-size:12px;margin-top:2px;`;
          addr.textContent = f.address;
          box.appendChild(addr);
        }
        const link = document.createElement("a");
        link.href = `/agricultor/${f.id}`;
        link.textContent = "Ver perfil →";
        link.style.cssText = `color:${MAP_PRIMARY};font-size:12px;display:inline-block;margin-top:4px;`;
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
        strokeColor: MAP_PRIMARY,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: MAP_PRIMARY,
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

        <div className="grid gap-4 md:grid-cols-[1fr_300px]">
          <MapConsentGate className="h-72 md:h-[480px]">
            <div ref={mapRef} className="h-72 w-full rounded-lg border border-border bg-muted md:h-[480px]" />
          </MapConsentGate>

          <aside className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Onde procurar</p>
              <Button type="button" variant="outline" className="w-full gap-2" onClick={locateMe} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                Usar a minha localização
              </Button>
              <div className="space-y-1">
                <Label htmlFor="map-region" className="text-xs text-muted-foreground">Ou escolha um distrito</Label>
                <select
                  id="map-region"
                  value=""
                  onChange={(e) => {
                    const r = PT_REGIONS.find((x) => x.name === e.target.value);
                    if (r) setCenter({ lat: r.lat, lng: r.lng, label: r.name });
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Escolher distrito...</option>
                  {PT_REGIONS.map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">Ou clique no mapa para escolher o centro.</p>
              {center && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs">
                  <span className="text-foreground">Centro: {center.label}</span>
                  <button type="button" onClick={() => setCenter(null)} className="text-muted-foreground hover:text-foreground" aria-label="Limpar o centro">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">Raio</Label>
                <span className="text-sm font-semibold text-primary">{radius} km</span>
              </div>
              <Slider
                value={[radius]}
                onValueChange={(v) => setRadius(v[0])}
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={5}
                aria-label="Raio em quilómetros"
              />
              {!center && <p className="text-xs text-muted-foreground">O raio aplica-se depois de escolher onde procurar.</p>}
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-sm font-medium text-foreground">
                {loadingFarms
                  ? "A carregar agricultores…"
                  : center
                    ? `${listed.length} agricultor${listed.length === 1 ? "" : "es"} até ${radius} km`
                    : `${listed.length} agricultor${listed.length === 1 ? "" : "es"}`}
              </p>
              {!loadingFarms && listed.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {center ? "Nenhum agricultor neste raio. Aumente o raio ou escolha outro local." : "Ainda não há agricultores no mapa."}
                </p>
              ) : (
                <ul className="max-h-60 space-y-1.5 overflow-y-auto md:max-h-[220px]">
                  {listed.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          navigate(`/agricultor/${f.id}`);
                        }}
                        className="flex w-full items-start gap-2 rounded-lg border border-border p-2 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{f.name}</span>
                          {f.address && <span className="block truncate text-xs text-muted-foreground">{f.address}</span>}
                        </span>
                        {f.distance != null && <span className="shrink-0 text-xs text-muted-foreground">{formatKm(f.distance)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortugalMapDialog;
