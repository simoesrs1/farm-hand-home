import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Map, MapPin } from "lucide-react";
import { farmers } from "@/data/farmers";

// Approximate coordinates (% of viewBox) for Portuguese cities/regions on a simple silhouette.
const cityCoords: Record<string, { x: number; y: number }> = {
  Braga: { x: 30, y: 18 },
  "Vila Real": { x: 52, y: 22 },
  Coimbra: { x: 30, y: 42 },
  Sintra: { x: 18, y: 60 },
  Lisboa: { x: 22, y: 63 },
  Évora: { x: 42, y: 70 },
  Beja: { x: 45, y: 82 },
  Faro: { x: 42, y: 95 },
};

const PortugalMapDialog = () => {
  const navigate = useNavigate();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Map className="h-4 w-4" />
          Ver mapa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agricultores em Portugal</DialogTitle>
        </DialogHeader>
        <div className="relative mx-auto w-full max-w-md">
          {/* Simplified Portugal silhouette */}
          <svg viewBox="0 0 100 120" className="w-full h-auto">
            <path
              d="M 30 5 L 55 8 L 60 25 L 58 45 L 55 65 L 50 85 L 48 100 L 40 115 L 25 110 L 18 90 L 15 70 L 18 50 L 20 30 Z"
              fill="hsl(var(--muted))"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
            />
            {farmers.map((f) => {
              const c = cityCoords[f.location];
              if (!c) return null;
              return (
                <g
                  key={f.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/agricultor/${f.id}`)}
                >
                  <circle cx={c.x} cy={c.y} r="2.5" fill="hsl(var(--primary))" className="animate-pulse" />
                  <circle cx={c.x} cy={c.y} r="1" fill="hsl(var(--primary-foreground))" />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
          {farmers.map((f) => (
            <button
              key={f.id}
              onClick={() => navigate(`/agricultor/${f.id}`)}
              className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left text-sm hover:bg-accent/10 transition-colors"
            >
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-foreground">{f.farm}</span>
              <span className="text-xs text-muted-foreground ml-auto">{f.location}, {f.region}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortugalMapDialog;
