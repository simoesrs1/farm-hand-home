/**
 * Localização de pesquisa: o ponto a partir do qual se ordenam produtos,
 * experiências e alojamento do mais perto para o mais longe.
 *
 * Vem de uma de quatro origens: a localização do aparelho, um distrito ou um
 * ponto escolhido no mapa da página inicial, ou um concelho escrito pelo
 * cliente. Fica só no navegador (nunca é enviada para a plataforma): durante a
 * sessão e, com o consentimento de preferências, entre visitas (scopedStorage).
 */
import { useEffect, useSyncExternalStore } from "react";
import { MUNICIPALITIES, type Municipality } from "@/data/municipios";
import { scopedStorage, STORAGE_KEYS } from "@/lib/consent";
import { useConsent } from "@/contexts/ConsentContext";

export type SearchLocationSource = "device" | "district" | "municipality" | "map";

export interface SearchLocation {
  lat: number;
  lng: number;
  /** Nome a mostrar ("Coimbra", "Fundão"); vazio na localização do aparelho. */
  label: string;
  source: SearchLocationSource;
}

const isLocation = (v: unknown): v is SearchLocation =>
  !!v &&
  typeof v === "object" &&
  typeof (v as SearchLocation).lat === "number" &&
  typeof (v as SearchLocation).lng === "number" &&
  typeof (v as SearchLocation).source === "string";

const read = (): SearchLocation | null => {
  const v = scopedStorage.get<SearchLocation>(STORAGE_KEYS.searchLocation);
  return isLocation(v) ? v : null;
};

let current: SearchLocation | null | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getSearchLocation = (): SearchLocation | null => {
  if (current === undefined) current = typeof window === "undefined" ? null : read();
  return current;
};

export const setSearchLocation = (location: SearchLocation) => {
  current = location;
  scopedStorage.set(STORAGE_KEYS.searchLocation, location);
  emit();
};

export const clearSearchLocation = () => {
  current = null;
  scopedStorage.remove(STORAGE_KEYS.searchLocation);
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Pesquisa de concelhos sem acentos nem maiúsculas; os que começam pelo texto vêm primeiro. */
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export const findMunicipalities = (query: string, limit = 8): Municipality[] => {
  const q = normalize(query);
  if (q.length < 2) return [];
  const starts: Municipality[] = [];
  const contains: Municipality[] = [];
  for (const m of MUNICIPALITIES) {
    const name = normalize(m.name);
    if (name.startsWith(q)) starts.push(m);
    else if (name.includes(q)) contains.push(m);
  }
  return [...starts, ...contains].slice(0, limit);
};

const getPosition = (options: PositionOptions) =>
  new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options),
  );

const POSITION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 };

/**
 * Pede a localização do aparelho (o navegador mostra o pedido de autorização)
 * e guarda-a. Lança o erro da Geolocation API se não for possível.
 */
export const requestDeviceLocation = async (): Promise<SearchLocation> => {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    throw new Error("unavailable");
  }
  const pos = await getPosition(POSITION_OPTIONS);
  const location: SearchLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "", source: "device" };
  setSearchLocation(location);
  return location;
};

/**
 * Se o navegador já autorizou a localização, obtém-na sem mostrar nenhum
 * pedido. Se ainda não autorizou (ou não se sabe), não faz nada.
 */
export const tryDeviceLocation = async (): Promise<SearchLocation | null> => {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions || !("geolocation" in navigator)) return null;
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state !== "granted") return null;
    const before = getSearchLocation();
    const pos = await getPosition(POSITION_OPTIONS);
    // Entretanto o cliente escolheu outro sítio: essa escolha prevalece.
    if (getSearchLocation() !== before) return null;
    const location: SearchLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "", source: "device" };
    setSearchLocation(location);
    return location;
  } catch {
    return null;
  }
};

let deviceTried = false;

/**
 * Localização de pesquisa atual, atualizada em todos os componentes.
 * Ao abrir o site, a localização do aparelho (se já autorizada) tem
 * prioridade; senão usa-se a última pesquisada. Uma escolha feita depois
 * (distrito, concelho, mapa) passa a valer até à próxima visita.
 */
export const useSearchLocation = (): SearchLocation | null => {
  const location = useSyncExternalStore(subscribe, getSearchLocation, () => null);
  const { hasConsent } = useConsent();
  const prefs = hasConsent("preferences");

  // Aceitou as preferências depois de abrir o site: recupera a da visita anterior.
  useEffect(() => {
    if (!prefs || getSearchLocation()) return;
    const restored = scopedStorage.restore<SearchLocation>(STORAGE_KEYS.searchLocation);
    if (isLocation(restored)) setSearchLocation(restored);
  }, [prefs]);

  useEffect(() => {
    if (deviceTried) return;
    deviceTried = true;
    void tryDeviceLocation();
  }, []);

  return location;
};
