/** Distâncias e filtro por raio para o mapa de agricultores. */
export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em linha reta (fórmula de Haversine), em km. */
export const distanceKm = (a: LatLng, b: LatLng) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/** Pontos dentro do raio, do mais perto para o mais longe, com a distância. */
export const withinRadius = <T extends LatLng>(points: T[], center: LatLng, radiusKm: number) =>
  points
    .map((p) => ({ ...p, distance: distanceKm(center, p) }))
    .filter((p) => p.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

/** Distritos e regiões autónomas (capitais), para escolher onde procurar sem pesquisa por morada. */
export const PT_REGIONS: ({ name: string } & LatLng)[] = [
  { name: "Aveiro", lat: 40.6405, lng: -8.6538 },
  { name: "Beja", lat: 38.0151, lng: -7.8632 },
  { name: "Braga", lat: 41.5454, lng: -8.4265 },
  { name: "Bragança", lat: 41.8061, lng: -6.7567 },
  { name: "Castelo Branco", lat: 39.8222, lng: -7.4909 },
  { name: "Coimbra", lat: 40.2033, lng: -8.4103 },
  { name: "Évora", lat: 38.5714, lng: -7.9135 },
  { name: "Faro", lat: 37.0194, lng: -7.9322 },
  { name: "Guarda", lat: 40.5373, lng: -7.2658 },
  { name: "Leiria", lat: 39.7436, lng: -8.8071 },
  { name: "Lisboa", lat: 38.7223, lng: -9.1393 },
  { name: "Portalegre", lat: 39.2967, lng: -7.4285 },
  { name: "Porto", lat: 41.1579, lng: -8.6291 },
  { name: "Santarém", lat: 39.2369, lng: -8.685 },
  { name: "Setúbal", lat: 38.5244, lng: -8.8882 },
  { name: "Viana do Castelo", lat: 41.6932, lng: -8.8329 },
  { name: "Vila Real", lat: 41.3006, lng: -7.7441 },
  { name: "Viseu", lat: 40.6566, lng: -7.9125 },
  { name: "Madeira (Funchal)", lat: 32.6669, lng: -16.9241 },
  { name: "Açores (Ponta Delgada)", lat: 37.7412, lng: -25.6756 },
];

export const formatKm = (km: number) =>
  `${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`;
