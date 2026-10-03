import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, MapPin, Navigation } from "lucide-react";

declare global {
  interface Window {
    google: any;
    __initDeliveryRouteMap?: () => void;
  }
}

export interface RouteStop {
  orderId: string;
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  when: Date;
}

interface Props {
  farm: { lat: number; lng: number; name: string } | null;
  stops: RouteStop[];
}

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const DAY_COLORS = ["#2d6a4f", "#b45309", "#1d4ed8", "#9333ea", "#be123c", "#0f766e", "#a16207"];

// Route-planning map: farm as origin, one marker per delivery, grouped by day,
// with the straight-line distance from the farm to each stop.
const DeliveryRouteMapDialog = ({ farm, stops }: Props) => {
  const [open, setOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, { date: Date; stops: (RouteStop & { km: number | null })[] }>();
    for (const s of stops) {
      const key = s.when.toDateString();
      if (!map.has(key)) map.set(key, { date: s.when, stops: [] });
      map.get(key)!.stops.push({
        ...s,
        km: farm ? haversineKm(farm, s) : null,
      });
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({
        key,
        date: v.date,
        stops: v.stops.sort((a, b) => a.when.getTime() - b.when.getTime()),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [stops, farm]);

  useEffect(() => {
    if (!open) return;
    const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    if (!browserKey) return;

    const renderMap = () => {
      if (!mapRef.current || !window.google?.maps) return;
      const center = farm ?? (stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: 39.5, lng: -8.0 });
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
            fillColor: "#1a2e1f",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        bounds.extend(farm);
      }

      byDay.forEach((day, dayIndex) => {
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
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });
          const info = new window.google.maps.InfoWindow({
            content: `<div style="font-family:system-ui;max-width:220px;">
              <strong>${s.label}</strong><br/>
              <span style="color:#666;font-size:12px;">${s.address ?? "Morada por confirmar"}</span><br/>
              <span style="font-size:12px;">${s.when.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}${s.km != null ? ` · ${s.km.toFixed(1)} km` : ""}</span>
            </div>`,
          });
          marker.addListener("click", () => info.open({ anchor: marker, map }));
          bounds.extend({ lat: s.lat, lng: s.lng });
          path.push({ lat: s.lat, lng: s.lng });
        });
        if (path.length > 1) {
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
  }, [open, farm, stops, byDay]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MapIcon className="h-4 w-4" />
          Ver percurso no mapa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Percurso de entregas ao domicílio
          </DialogTitle>
        </DialogHeader>

        {stops.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ainda não há entregas ativas com ponto de entrega marcado pelo cliente.
          </p>
        ) : (
          <>
            <div ref={mapRef} className="h-[400px] w-full rounded-lg border border-border bg-muted" />
            <div className="mt-4 max-h-56 space-y-3 overflow-y-auto">
              {byDay.map((day, dayIndex) => (
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
                  <ul className="mt-1 space-y-1">
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
                        <span className="text-xs text-muted-foreground">
                          {s.when.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {s.km != null && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {s.km.toFixed(1)} km
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Distâncias em linha reta desde a sua exploração. A numeração sugere a ordem do percurso
              em cada dia.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryRouteMapDialog;
