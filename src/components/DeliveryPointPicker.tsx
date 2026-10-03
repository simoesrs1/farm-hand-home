import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

declare global {
  interface Window {
    google: any;
    __initDeliveryPicker?: () => void;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: { lat: number; lng: number } | null;
  onConfirm: (point: { lat: number; lng: number }) => void;
}

// Map picker for the client to mark the exact home-delivery point.
const DeliveryPointPicker = ({ open, onOpenChange, value, onConfirm }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(value);

  useEffect(() => {
    if (open) setPicked(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    if (!browserKey) return;

    const renderMap = () => {
      if (!mapRef.current || !window.google?.maps) return;
      const center = value ?? { lat: 39.5, lng: -8.0 };
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: value ? 14 : 6,
        mapTypeControl: false,
        streetViewControl: false,
        clickableIcons: false,
      });
      if (value) {
        markerRef.current = new window.google.maps.Marker({ position: value, map });
      }
      map.addListener("click", (e: any) => {
        const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setPicked(point);
        if (markerRef.current) {
          markerRef.current.setPosition(point);
        } else {
          markerRef.current = new window.google.maps.Marker({ position: point, map });
        }
      });
    };

    if (window.google?.maps) {
      renderMap();
      return;
    }
    window.__initDeliveryPicker = renderMap;
    if (document.getElementById("gmaps-sdk")) return;
    const script = document.createElement("script");
    script.id = "gmaps-sdk";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=__initDeliveryPicker`;
    document.head.appendChild(script);
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Marcar o ponto de entrega</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Toque no mapa no local exato onde o agricultor deve entregar a encomenda.
        </p>
        <div ref={mapRef} className="h-[380px] w-full rounded-lg border border-border bg-muted" />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {picked
              ? `Ponto marcado: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
              : "Ainda sem ponto marcado."}
          </p>
          <Button
            disabled={!picked}
            onClick={() => {
              if (picked) {
                onConfirm(picked);
                onOpenChange(false);
              }
            }}
            className="gap-2"
          >
            <MapPin className="h-4 w-4" /> Confirmar ponto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryPointPicker;
