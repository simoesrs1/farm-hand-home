import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Search, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import heroImage from "@/assets/hero-farm.jpg";
import PortugalMapDialog from "@/components/PortugalMapDialog";
import { fadeUp, gsap, splitHeading, useGSAP } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isInSeason, pickVaried, useHomeProducts } from "@/hooks/useHomeProducts";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import TranslatedText from "@/components/TranslatedText";

// Posição e inclinação de cada cartão da colagem (3 produtos).
const COLLAGE_LAYOUT = [
  "left-0 top-16 w-56 -rotate-3",
  "right-0 top-0 w-52 rotate-2",
  "bottom-0 left-[38%] w-56 rotate-1",
];

const HeroSection = () => {
  const [location, setLocation] = useState("");
  const [farmName, setFarmName] = useState("");
  const [radius, setRadius] = useState([25]);
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { data: products = [] } = useHomeProducts();
  const { t } = useTranslation("home");

  // Três produtos do momento, de categorias diferentes (da época primeiro).
  const collage = useMemo(() => {
    const seasonal = products.filter((p) => isInSeason(p));
    return pickVaried(seasonal.length >= 3 ? seasonal : products, 3);
  }, [products]);
  const collageKey = collage.map((p) => p.id).join(",");

  const handleLocationSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    params.set("radius", String(radius[0]));
    navigate(`/resultados?${params.toString()}`);
  };

  const handleFarmSearch = () => {
    const params = new URLSearchParams();
    if (farmName) params.set("location", farmName);
    navigate(`/resultados?${params.toString()}`);
  };

  // Entrada: título linha a linha (sem opacidade, por causa do LCP), depois subtítulo e pesquisa.
  useGSAP(
    () => {
      if (reducedMotion) return;
      splitHeading(".hero-title");
      fadeUp(".hero-subtitle", { delay: 0.25 });
      fadeUp(".hero-search", { y: 32, delay: 0.4 });
    },
    { scope: sectionRef, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  // Colagem: os cartões sobem e endireitam-se; os selos de preço saltam a seguir.
  useGSAP(
    () => {
      if (reducedMotion || !collageKey) return;
      gsap.from(".hero-card", { y: 60, rotation: (i: number) => [-9, 7, 5][i] ?? 0, stagger: 0.12, duration: 0.9, delay: 0.3 });
      gsap.from(".hero-badge", { scale: 0, rotation: -25, ease: "back.out(3)", stagger: 0.12, duration: 0.6, delay: 0.85 });
    },
    { scope: sectionRef, dependencies: [reducedMotion, collageKey], revertOnUpdate: true },
  );

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-b border-border">
      <div className="container grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <h1 className="hero-title max-w-2xl text-balance font-display text-4xl leading-[1.05] text-foreground md:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="hero-subtitle mt-5 max-w-xl text-lg text-muted-foreground">
            {t("hero.subtitle")}
          </p>

          <div className="hero-search mt-8 w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <Tabs defaultValue="location" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="location" className="gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {t("hero.byLocation")}
                </TabsTrigger>
                <TabsTrigger value="farm" className="gap-1.5">
                  <Sprout className="h-3.5 w-3.5" />
                  {t("hero.byFarm")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="location" className="mt-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="hero-location"
                      className="mb-1.5 block text-left text-xs font-medium text-muted-foreground"
                    >
                      {t("hero.yourLocation")}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="hero-location"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                        placeholder={t("hero.locationPlaceholder")}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="mb-1.5 block text-left text-xs font-medium text-muted-foreground">
                      {t("hero.radius")} <span className="font-semibold text-primary">{radius[0]} km</span>
                    </p>
                    <Slider
                      aria-label={t("hero.radiusAria", { km: radius[0] })}
                      value={radius}
                      onValueChange={setRadius}
                      min={5}
                      max={100}
                      step={5}
                      className="py-2"
                    />
                  </div>
                  <Button className="gap-2 md:px-6" onClick={handleLocationSearch}>
                    <Search className="h-4 w-4" />
                    {t("hero.search")}
                  </Button>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">{t("hero.preferMap")}</p>
                  <PortugalMapDialog />
                </div>
              </TabsContent>

              <TabsContent value="farm" className="mt-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="hero-farm-name"
                      className="mb-1.5 block text-left text-xs font-medium text-muted-foreground"
                    >
                      {t("hero.farmName")}
                    </label>
                    <div className="relative">
                      <Sprout className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="hero-farm-name"
                        type="text"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleFarmSearch()}
                        placeholder={t("hero.farmPlaceholder")}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button className="gap-2 md:px-6" onClick={handleFarmSearch}>
                    <Search className="h-4 w-4" />
                    {t("hero.search")}
                  </Button>
                </div>
                <p className="mt-4 border-t border-border pt-3 text-left text-xs text-muted-foreground">
                  {t("hero.farmHint")}
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Colagem de produtos reais (só em ecrãs largos; no telemóvel a faixa "Da época" vem logo a seguir) */}
        <div className="relative hidden h-[460px] lg:block" aria-label={t("hero.collageAria")}>
          <div className="absolute inset-10 rounded-full bg-highlight/50" aria-hidden />
          {collage.length > 0 ? (
            collage.map((p, i) => (
              <Link
                key={p.id}
                to={`/produto/${p.id}`}
                className={cn(
                  "hero-card absolute block overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-shadow hover:shadow-xl",
                  COLLAGE_LAYOUT[i],
                )}
              >
                <img src={p.image} alt="" className="aspect-[4/3] w-full object-cover" />
                <span className="hero-badge absolute right-3 top-3 rounded-full bg-highlight px-3 py-1 font-mono text-sm font-bold tabular-nums text-highlight-foreground shadow-sm">
                  {formatEuro(p.price)}
                </span>
                <span className="block p-3">
                  <TranslatedText type="product" id={p.id} field="name" text={p.name} className="block truncate font-semibold text-foreground" />
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.farmer} · /{p.unit}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <img
              src={heroImage}
              alt={t("hero.imageAlt")}
              className="absolute inset-0 h-full w-full rounded-3xl object-cover"
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
