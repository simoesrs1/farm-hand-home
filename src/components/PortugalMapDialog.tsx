import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Map, MapPin } from "lucide-react";
import { farmers } from "@/data/farmers";

// Approximate coordinates for Portuguese cities used by sample farmers.
const cityCoords: Record<string, { lat: number; lng: number }> = {
  Braga: { lat: 41.5454, lng: -8.4265 },
  "Vila Real": { lat: 41.3006, lng: -7.7441 },
  Coimbra: { lat: 40.2033, lng: -8.4103 },
  Sintra: { lat: 38.8029, lng: -9.3817 },
  Lisboa: { lat: 38.7223, lng: -9.1393 },
  Évora: { lat: 38.5713, lng: -7.9135 },
  Beja: { lat: 38.0150, lng: -7.8632 },
  Faro: { lat: 37.0194, lng: -7.9304 },
};

declare global {
  interface Window {
    google: any;
    __initFarmConnectMap?: () => void;
  }
}

const PortugalMapDialog = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!open) return;

    const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const trackingId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

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
        const c = cityCoords[f.location];
        if (!c) return;
        const marker = new window.google.maps.Marker({
          position: c,
          map: mapInstance.current,
          title: f.farm,
        });
        const info = new window.google.maps.InfoWindow({
          content: `<div style="font-family: system-ui; max-width: 200px;">
            <strong>${f.farm}</strong><br/>
            <span style="color:#666;font-size:12px;">${f.location}, ${f.region}</span><br/>
            <a href="/agricultor/${f.id}" style="color:#2d6a4f;font-size:12px;">Ver perfil →</a>
          </div>`,
        });
        marker.addListener("click", () => {
          info.open({ anchor: marker, map: mapInstance.current });
        });
      });
    };

    if (window.google?.maps) {
      renderMap();
      return;
    }

    window.__initFarmConnectMap = renderMap;

    const existing = document.getElementById("gmaps-sdk");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "gmaps-sdk";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=__initFarmConnectMap&channel=${trackingId}`;
    document.head.appendChild(script);
  }, [open]);

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
        <div ref={mapRef} className="h-[420px] w-full rounded-lg border border-border bg-muted" />
        <div className="mt-4 max-h-40 overflow-y-auto space-y-2">
          {farmers.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setOpen(false);
                navigate(`/agricultor/${f.id}`);
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left text-sm hover:bg-accent/10 transition-colors"
            >
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-foreground">{f.farm}</span>
              <span className="text-xs text-muted-foreground ml-auto">{f.location}, {f.region}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortugalMapDialog;
