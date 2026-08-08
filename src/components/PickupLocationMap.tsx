import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: any;
    __initPickupMap?: () => void;
  }
}

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Realça o mapa a vermelho quando falta marcar o ponto de levantamento. */
  invalid?: boolean;
}

const PORTUGAL_CENTER = { lat: 39.5, lng: -8.0 };

const PickupLocationMap = ({ lat, lng, onChange, invalid }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    if (!browserKey) {
      console.warn(
        "VITE_GOOGLE_MAPS_BROWSER_KEY não definida — o mapa não será carregado.",
      );
      setUnavailable(true);
      return;
    }

    const initialize = () => {
      if (!mapRef.current || !window.google?.maps || mapInstance.current) return;

      const initialCenter =
        lat != null && lng != null ? { lat, lng } : PORTUGAL_CENTER;
      const initialZoom = lat != null && lng != null ? 14 : 6;

      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      if (lat != null && lng != null) {
        markerInstance.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance.current,
          draggable: true,
        });
        attachDrag();
      }

      mapInstance.current.addListener("click", (e: any) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        placeMarker(newLat, newLng);
        onChange(newLat, newLng);
      });
    };

    const placeMarker = (la: number, ln: number) => {
      if (!markerInstance.current) {
        markerInstance.current = new window.google.maps.Marker({
          position: { lat: la, lng: ln },
          map: mapInstance.current,
          draggable: true,
        });
        attachDrag();
      } else {
        markerInstance.current.setPosition({ lat: la, lng: ln });
      }
    };

    const attachDrag = () => {
      markerInstance.current.addListener("dragend", (e: any) => {
        onChange(e.latLng.lat(), e.latLng.lng());
      });
    };

    if (window.google?.maps) {
      initialize();
      return;
    }

    window.__initPickupMap = initialize;

    if (document.getElementById("gmaps-sdk")) {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          initialize();
        }
      }, 200);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.id = "gmaps-sdk";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=__initPickupMap`;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker if coordinates change externally
  useEffect(() => {
    if (!mapInstance.current || lat == null || lng == null) return;
    const pos = { lat, lng };
    if (!markerInstance.current) {
      markerInstance.current = new window.google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        draggable: true,
      });
      markerInstance.current.addListener("dragend", (e: any) => {
        onChange(e.latLng.lat(), e.latLng.lng());
      });
    } else {
      markerInstance.current.setPosition(pos);
    }
    mapInstance.current.panTo(pos);
  }, [lat, lng, onChange]);

  if (unavailable) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Mapa indisponível — falta configurar a chave do Google Maps.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`h-72 w-full rounded-lg border bg-muted ${
        invalid ? "border-destructive ring-2 ring-destructive/20" : "border-border"
      }`}
    />
  );
};

export default PickupLocationMap;
