import { useEffect, useRef } from "react";

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
}

const PORTUGAL_CENTER = { lat: 39.5, lng: -8.0 };

const PickupLocationMap = ({ lat, lng, onChange }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  useEffect(() => {
    const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const trackingId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=__initPickupMap&channel=${trackingId}`;
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

  return (
    <div
      ref={mapRef}
      className="h-72 w-full rounded-lg border border-border bg-muted"
    />
  );
};

export default PickupLocationMap;
