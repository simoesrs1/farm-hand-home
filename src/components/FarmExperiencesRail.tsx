import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, Tent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import SectionHeading from "@/components/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { formatEuro } from "@/lib/format";
import { useTranslation } from "react-i18next";
import TranslatedText from "@/components/TranslatedText";

interface RailItem {
  id: string;
  kind: "experience" | "stay";
  title: string;
  farmerId: string;
  farm: string;
  price: number;
  priceUnit: "stayPerPerson" | "stay" | "perPerson" | "perGroup";
  image: string | null;
}

const isVideo = (path: string) => /\.(mp4|webm|mov)$/i.test(path);

const fetchRail = async (): Promise<RailItem[]> => {
  const [{ data: experiences }, { data: stays }] = await Promise.all([
    supabase
      .from("farm_experiences")
      .select("id, title, farmer_id, base_price, pricing_mode, media_urls")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("farm_stays")
      .select("id, title, farmer_id, base_price, pricing_mode, media_urls")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const rows = [
    ...(experiences ?? []).map((e) => ({ ...e, kind: "experience" as const })),
    ...(stays ?? []).map((s) => ({ ...s, kind: "stay" as const })),
  ];
  if (!rows.length) return [];

  const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
  const { data: farmers } = await supabase
    .from("public_farmer_profiles")
    .select("id, company_name")
    .in("id", farmerIds);
  const farmById = new Map((farmers ?? []).map((f) => [f.id, f.company_name ?? "Quinta"]));

  const photo = (media: string[]) => media.find((p) => !isVideo(p));
  const paths = rows.map((r) => photo(r.media_urls)).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("product-media").createSignedUrls(paths, 60 * 60);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  return rows.map((r) => {
    const path = photo(r.media_urls);
    const priceUnit =
      r.kind === "stay"
        ? r.pricing_mode === "per_person" ? ("stayPerPerson" as const) : ("stay" as const)
        : r.pricing_mode === "per_person" ? ("perPerson" as const) : ("perGroup" as const);
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      farmerId: r.farmer_id,
      farm: farmById.get(r.farmer_id) ?? "Quinta",
      price: Number(r.base_price),
      priceUnit,
      image: path ? signed.get(path) ?? null : null,
    };
  });
};

/** "Visite a quinta": experiências e alojamento, num carrossel. Abre o perfil do agricultor, onde se reserva. */
const FarmExperiencesRail = () => {
  const { data: items = [] } = useQuery({ queryKey: ["home-experiences"], queryFn: fetchRail, staleTime: 5 * 60 * 1000 });
  const { t } = useTranslation("home");

  if (items.length === 0) return null;

  return (
    <section className="border-y border-border bg-card py-16 md:py-20">
      <div className="container">
        <Carousel opts={{ align: "start" }}>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow={t("rail.eyebrow")}
              title={t("rail.title")}
              description={t("rail.description")}
            />
            <div className="flex gap-2">
              <CarouselPrevious className="static translate-y-0" aria-label={t("rail.previous")} />
              <CarouselNext className="static translate-y-0" aria-label={t("rail.next")} />
            </div>
          </div>
          <CarouselContent>
            {items.map((it) => (
              <CarouselItem key={`${it.kind}-${it.id}`} className="basis-[85%] sm:basis-1/2 lg:basis-1/3">
                <Link
                  to={`/agricultor/${it.farmerId}`}
                  className="group block h-full overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md"
                >
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
                    {it.image ? (
                      <img
                        src={it.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                      />
                    ) : it.kind === "stay" ? (
                      <BedDouble className="h-10 w-10 text-muted-foreground" aria-hidden />
                    ) : (
                      <Tent className="h-10 w-10 text-muted-foreground" aria-hidden />
                    )}
                    <Badge variant="highlight" className="absolute left-3 top-3">
                      {it.kind === "stay" ? t("rail.stay") : t("rail.experience")}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">
                      <TranslatedText type={it.kind} id={it.id} field="title" text={it.title} />
                    </h3>
                    <p className="text-xs text-muted-foreground">{it.farm}</p>
                    <p className="mt-3">
                      <span className="font-mono text-lg font-bold tabular-nums text-primary">{formatEuro(it.price)}</span>
                      <span className="text-xs text-muted-foreground"> {t(`rail.unit.${it.priceUnit}`)}</span>
                    </p>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
};

export default FarmExperiencesRail;
