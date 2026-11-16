import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { distanceKm, formatKm, type LatLng } from "@/lib/geo";
import { isVideoPath, signMedia } from "@/lib/media-upload";

/** Campos comuns a experiências e alojamento. */
export interface FarmListing {
  id: string;
  farmer_id: string;
  title: string;
  base_price: number;
  media_urls: string[];
  created_at: string;
}

export type Farm = { id: string; name: string; position: LatLng | null };

type SortOption = "recentes" | "preco_asc" | "preco_desc" | "perto";

const sortLabels: Record<SortOption, string> = {
  recentes: "Mais recentes",
  preco_asc: "Preço mais baixo",
  preco_desc: "Preço mais alto",
  perto: "Mais perto de mim",
};

interface FarmListingsProps<T extends FarmListing> {
  table: "farm_experiences" | "farm_stays";
  title: string;
  description: string;
  /** "experiência(s)" ou "alojamento(s)", para o contador. */
  noun: [string, string];
  emptyText: string;
  renderCard: (item: T, extra: { thumb?: string; farmName: string; distance?: string; onClick: () => void }) => ReactNode;
  renderDialog: (selected: T | null, farm: Farm | null, isOwner: boolean, close: () => void) => ReactNode;
}

/**
 * Página estilo catálogo com as experiências ou o alojamento de todas as
 * quintas (só os ativos de quintas publicadas, pela RLS): pesquisa, ordenação e
 * o balão de detalhes e reserva do perfil da quinta.
 */
function FarmListings<T extends FarmListing>({ table, title, description, noun, emptyText, renderCard, renderDialog }: FarmListingsProps<T>) {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [farms, setFarms] = useState<Record<string, Farm>>({});
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("recentes");
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [selected, setSelected] = useState<T | null>(null);
  const [myFarmerId, setMyFarmerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from(table).select("*").eq("active", true).order("created_at", { ascending: false });
      const list = (data ?? []) as unknown as T[];
      const farmerIds = [...new Set(list.map((i) => i.farmer_id))];
      const [{ data: farmRows }, signed] = await Promise.all([
        farmerIds.length
          ? supabase.from("public_farmer_profiles").select("id, company_name, pickup_lat, pickup_lng").in("id", farmerIds)
          : Promise.resolve({ data: [] as { id: string; company_name: string; pickup_lat: number | null; pickup_lng: number | null }[] }),
        signMedia(list.map((i) => i.media_urls.find((p) => !isVideoPath(p))).filter((p): p is string => !!p)),
      ]);
      if (cancelled) return;
      const farmMap: Record<string, Farm> = {};
      for (const f of farmRows ?? []) {
        farmMap[f.id as string] = {
          id: f.id as string,
          name: f.company_name ?? "Quinta",
          position: f.pickup_lat != null && f.pickup_lng != null ? { lat: Number(f.pickup_lat), lng: Number(f.pickup_lng) } : null,
        };
      }
      // Só entra o que tem a quinta visível ao público.
      setItems(list.filter((i) => farmMap[i.farmer_id]));
      setFarms(farmMap);
      setThumbs(Object.fromEntries(list.map((i) => [i.id, signed[i.media_urls.find((p) => !isVideoPath(p)) ?? ""] ?? ""])));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [table]);

  // O agricultor não pode reservar na própria quinta.
  useEffect(() => {
    if (!user) {
      setMyFarmerId(null);
      return;
    }
    supabase
      .from("farmer_details")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setMyFarmerId(data?.id ?? null));
  }, [user]);

  const distanceOf = (i: T) => {
    const pos = farms[i.farmer_id]?.position;
    return userPos && pos ? distanceKm(userPos, pos) : null;
  };

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt");
    const list = items.filter(
      (i) => !q || i.title.toLocaleLowerCase("pt").includes(q) || (farms[i.farmer_id]?.name ?? "").toLocaleLowerCase("pt").includes(q),
    );
    const dist = (i: T) => distanceOf(i) ?? Number.POSITIVE_INFINITY;
    switch (sort) {
      case "preco_asc":
        return [...list].sort((a, b) => Number(a.base_price) - Number(b.base_price));
      case "preco_desc":
        return [...list].sort((a, b) => Number(b.base_price) - Number(a.base_price));
      case "perto":
        return [...list].sort((a, b) => dist(a) - dist(b));
      default:
        return list;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, farms, query, sort, userPos]);

  const changeSort = (value: SortOption) => {
    if (value !== "perto" || userPos) {
      setSort(value);
      return;
    }
    if (!("geolocation" in navigator)) {
      toast({ title: "Localização indisponível", description: "Este navegador não permite obter a localização.", variant: "destructive" });
      return;
    }
    // A localização fica só no navegador, para ordenar; não é guardada nem enviada.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("perto");
      },
      () => toast({ title: "Não foi possível obter a localização", description: "Autorize a localização para ordenar por distância.", variant: "destructive" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const selectedFarm = selected ? farms[selected.farmer_id] ?? null : null;

  return (
    <main className="py-12">
      <div className="container">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar pelo nome ou pela quinta"
              className="pl-9"
              aria-label="Pesquisar"
            />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{shown.length}</span> {shown.length === 1 ? noun[0] : noun[1]}
            </p>
            <Select value={sort} onValueChange={(v) => changeSort(v as SortOption)}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {items.length === 0 ? emptyText : "Nenhum resultado para esta pesquisa."}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((i) => {
              const d = distanceOf(i);
              return (
                <div key={i.id} className="contents">
                  {renderCard(i, {
                    thumb: thumbs[i.id] || undefined,
                    farmName: farms[i.farmer_id]?.name ?? "Quinta",
                    distance: d != null ? formatKm(d) : undefined,
                    onClick: () => setSelected(i),
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {renderDialog(selected, selectedFarm, !!selected && selected.farmer_id === myFarmerId, () => setSelected(null))}
    </main>
  );
}

export default FarmListings;
