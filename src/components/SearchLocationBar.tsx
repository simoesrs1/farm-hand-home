import { useMemo, useState } from "react";
import { Crosshair, Loader2, MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  clearSearchLocation,
  findMunicipalities,
  requestDeviceLocation,
  setSearchLocation,
  type SearchLocation,
} from "@/lib/search-location";
import { cn } from "@/lib/utils";

interface SearchLocationBarProps {
  location: SearchLocation | null;
  /** Depois de escolher uma localização (ex.: para passar a ordenar por distância). */
  onPicked?: () => void;
  /** Depois de limpar a localização. */
  onCleared?: () => void;
  className?: string;
}

/**
 * Linha "Mais perto de: X" com "Alterar" e "Limpar", ou o convite a escolher
 * uma localização. Escolhe-se um concelho (lista local, sem serviços externos)
 * ou a localização do aparelho; tudo fica só no navegador.
 */
const SearchLocationBar = ({ location, onPicked, onCleared, className }: SearchLocationBarProps) => {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const results = useMemo(() => findMunicipalities(query), [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const useDevice = async () => {
    setLocating(true);
    try {
      await requestDeviceLocation();
      close();
      onPicked?.();
    } catch (err) {
      // GeolocationPositionError.PERMISSION_DENIED = 1
      const denied = (err as { code?: number } | null)?.code === 1;
      toast({
        title: t("searchLocation.deviceFailed"),
        description: denied ? t("searchLocation.deviceDenied") : t("searchLocation.deviceRetry"),
        variant: "destructive",
      });
    } finally {
      setLocating(false);
    }
  };

  const label = location ? (location.source === "device" ? t("searchLocation.you") : location.label) : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-card px-3 py-2 text-sm",
        className,
      )}
    >
      <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="text-foreground">
        {label ? (
          <>
            {t("searchLocation.near")} <strong className="font-semibold">{label}</strong>
          </>
        ) : (
          t("searchLocation.none")
        )}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Popover open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              {location ? t("searchLocation.change") : t("searchLocation.choose")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3 p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={useDevice}
              disabled={locating}
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              {locating ? t("searchLocation.locating") : t("searchLocation.useDevice")}
            </Button>
            <div className="space-y-1">
              <label htmlFor="search-location-input" className="text-xs text-muted-foreground">
                {t("searchLocation.orMunicipality")}
              </label>
              <Input
                id="search-location-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchLocation.placeholder")}
                autoComplete="off"
                autoFocus
              />
            </div>
            {query.trim().length >= 2 && (
              <ul className="max-h-60 overflow-y-auto" role="listbox" aria-label={t("searchLocation.orMunicipality")}>
                {results.length === 0 ? (
                  <li className="px-2 py-1.5 text-xs text-muted-foreground">{t("searchLocation.noResults")}</li>
                ) : (
                  results.map((m) => (
                    <li key={m.name}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
                        onClick={() => {
                          setSearchLocation({ lat: m.lat, lng: m.lng, label: m.name, source: "municipality" });
                          close();
                          onPicked?.();
                        }}
                      >
                        <span className="text-foreground">{m.name}</span>
                        <span className="text-xs text-muted-foreground">{m.district}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </PopoverContent>
        </Popover>
        {location && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() => {
              clearSearchLocation();
              onCleared?.();
            }}
          >
            <X className="h-3.5 w-3.5" /> {t("actions.clear")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SearchLocationBar;
