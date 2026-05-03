import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import heroImage from "@/assets/hero-farm.jpg";
import PortugalMapDialog from "@/components/PortugalMapDialog";

const HeroSection = () => {
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState([25]);
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    params.set("radius", String(radius[0]));
    navigate(`/resultados?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background image with overlay */}
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
        <p className="mt-4 max-w-xl text-base text-primary-foreground/80 md:text-lg animate-fade-in" style={{ animationDelay: "0.15s" }}>
          Descubra agricultores locais perto de si e compre produtos frescos diretamente de quem cultiva.
        </p>

        {/* Search card */}
        <div
          className="mt-10 w-full max-w-2xl rounded-2xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur-sm animate-fade-in md:p-6"
          style={{ animationDelay: "0.3s" }}
        >
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
                  placeholder="Ex: Lisboa, Sintra, Évora..."
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-left text-xs font-medium text-muted-foreground">
                Raio de distância: <span className="font-semibold text-primary">{radius[0]} km</span>
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
            <Button className="gap-2 md:px-6" onClick={handleSearch}>
              <Search className="h-4 w-4" />
              Procurar
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">Prefere visualizar no mapa?</p>
            <PortugalMapDialog />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
