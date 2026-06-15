import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import heroImage from "@/assets/hero-farm.jpg";
import PortugalMapDialog from "@/components/PortugalMapDialog";

const HeroSection = () => {
  const [location, setLocation] = useState("");
  const [farmName, setFarmName] = useState("");
  const [radius, setRadius] = useState([25]);
  const navigate = useNavigate();

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

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Campos agrícolas portugueses ao pôr do sol"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/50 to-background" />
      </div>

      <div className="container relative z-10 flex flex-col items-center py-24 text-center md:py-36">
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl animate-fade-in">
          Do campo para a sua mesa, sem intermediários
        </h1>
        <p className="mt-4 max-w-xl text-base text-primary-foreground/80 md:text-lg animate-fade-in whitespace-pre-line" style={{ animationDelay: "0.15s" }}>
          Descubra produtos frescos diretamente de quem cultiva.{"\n"}Apoia o produtor local!
        </p>

        <div
          className="mt-10 w-full max-w-2xl rounded-2xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur-sm animate-fade-in md:p-6"
          style={{ animationDelay: "0.3s" }}
        >
          <Tabs defaultValue="location" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="location" className="gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Por localização
              </TabsTrigger>
              <TabsTrigger value="farm" className="gap-1.5">
                <Sprout className="h-3.5 w-3.5" />
                Por nome de quinta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="location" className="mt-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block text-left text-xs font-medium text-muted-foreground">
                    A sua localização
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                      placeholder="Ex: Lisboa, Sintra, Évora..."
                      className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-left text-xs font-medium text-muted-foreground">
                    Raio: <span className="font-semibold text-primary">{radius[0]} km</span>
                  </label>
                  <Slider
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
                  Procurar
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Prefere visualizar no mapa?</p>
                <PortugalMapDialog />
              </div>
            </TabsContent>

            <TabsContent value="farm" className="mt-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block text-left text-xs font-medium text-muted-foreground">
                    Nome da quinta
                  </label>
                  <div className="relative">
                    <Sprout className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFarmSearch()}
                      placeholder="Ex: Quinta do Vale Verde, Monte Alentejano..."
                      className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <Button className="gap-2 md:px-6" onClick={handleFarmSearch}>
                  <Search className="h-4 w-4" />
                  Procurar
                </Button>
              </div>
              <p className="mt-4 border-t border-border pt-3 text-left text-xs text-muted-foreground">
                Procure diretamente pelo nome de uma quinta ou agricultor.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
