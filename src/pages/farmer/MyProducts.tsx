import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Minus,
  Pencil,
  PackageOpen,
  ImageIcon,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number | null;
  media_urls: string[] | null;
  availability_start: string | null;
  availability_end: string | null;
  client_price: number;
  discount_percent: number | null;
  low_stock_threshold: number | null;
};

// `availability_start`/`availability_end` são colunas `date` (YYYY-MM-DD), por
// isso comparamos como texto contra o dia local para evitar saltos de fuso.
const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const daysUntil = (iso: string) => {
  const ms = new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayISO()}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
};

type AvailabilityState = "none" | "upcoming" | "active" | "ending" | "expired";

const availabilityState = (p: ProductRow): AvailabilityState => {
  if (!p.availability_end) return "none";
  const today = todayISO();
  if (p.availability_end < today) return "expired";
  if (p.availability_start && p.availability_start > today) return "upcoming";
  return daysUntil(p.availability_end) <= 7 ? "ending" : "active";
};

const MyProducts = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile && profile.profile_type !== "vendedor") {
      navigate("/");
    }
  }, [user, profile, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: farmer } = await supabase
      .from("farmer_details")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!farmer) {
      setFarmerId(null);
      setLoading(false);
      return;
    }
    setFarmerId(farmer.id);
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, unit, stock_quantity, media_urls, availability_start, availability_end, client_price, discount_percent, low_stock_threshold"
      )
      .eq("farmer_id", farmer.id)
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro a carregar produtos", description: error.message, variant: "destructive" });
    } else {
      setProducts((data ?? []) as ProductRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Signed URLs for the first media of each product
  useEffect(() => {
    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        products.map(async (p) => {
          const path = p.media_urls?.[0];
          if (!path) return;
          const { data } = await supabase.storage
            .from("product-media")
            .createSignedUrl(path, 60 * 60);
          if (data?.signedUrl) map[p.id] = data.signedUrl;
        })
      );
      setThumbs(map);
    })();
  }, [products]);

  // Notify farmer once per load about out-of-stock products
  const outOfStock = useMemo(
    () => products.filter((p) => (p.stock_quantity ?? 0) <= 0),
    [products]
  );
  const expired = useMemo(
    () => products.filter((p) => availabilityState(p) === "expired"),
    [products]
  );
  useEffect(() => {
    if (loading || notified) return;
    if (outOfStock.length > 0) {
      toast({
        title: `${outOfStock.length} produto(s) sem stock`,
        description: "Reponha stock diretamente na lista para voltarem à venda.",
      });
    }
    if (expired.length > 0) {
      toast({
        title: `${expired.length} produto(s) fora do prazo`,
        description: "A data de disponibilidade já passou. Atualize-a para continuarem à venda.",
        variant: "destructive",
      });
    }
    if (outOfStock.length > 0 || expired.length > 0) setNotified(true);
  }, [loading, notified, outOfStock.length, expired.length]);

  const resolveAmount = (p: ProductRow) => {
    const sel = preset[p.id] ?? "1";
    if (sel === "100+") {
      const n = parseInt(custom[p.id] ?? "", 10);
      if (!Number.isFinite(n) || n <= 100) {
        toast({ title: "Indique um valor superior a 100", variant: "destructive" });
        return 0;
      }
      return n;
    }
    return parseInt(sel, 10) || 0;
  };

  const applyStockDelta = async (p: ProductRow, sign: 1 | -1) => {
    const amount = resolveAmount(p);
    if (amount <= 0) return;
    const current = p.stock_quantity ?? 0;
    if (sign === -1 && current <= 0) {
      toast({ title: "Sem stock para retirar", variant: "destructive" });
      return;
    }
    const newStock = Math.max(0, current + sign * amount);
    setSavingId(p.id);
    const { error } = await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", p.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Erro a atualizar stock", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Stock atualizado",
      description: `${p.name}: ${sign === 1 ? "+" : "−"}${amount} → ${newStock}`,
    });
    setProducts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, stock_quantity: newStock } : x))
    );
    setPreset((s) => ({ ...s, [p.id]: "1" }));
    setCustom((s) => ({ ...s, [p.id]: "" }));
  };

  if (authLoading || loading) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Complete o registo de agricultor para gerir produtos.</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding/agricultor")}>
          Completar perfil
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Os meus produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão de stock dos artigos já publicados.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/agricultor/produtos/novo">
            <Plus className="h-4 w-4" /> Adicionar produto
          </Link>
        </Button>
      </div>

      {outOfStock.length > 0 && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Stock esgotado</AlertTitle>
          <AlertDescription>
            {outOfStock.length} produto(s) sem stock disponível. Reponha as unidades para voltarem à venda.
          </AlertDescription>
        </Alert>
      )}

      {expired.length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <CalendarClock className="h-4 w-4" />
          <AlertTitle>Prazo de disponibilidade terminado</AlertTitle>
          <AlertDescription>
            {expired.length} produto(s) com a data de fim já ultrapassada. Atualize o prazo para
            continuarem disponíveis para levantamento.
          </AlertDescription>
        </Alert>
      )}

      {products.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <PackageOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Ainda não publicou nenhum produto.</p>
          <Button asChild size="sm" className="gap-2">
            <Link to="/agricultor/produtos/novo">
              <Plus className="h-4 w-4" /> Adicionar o primeiro
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {products.map((p) => {
            const stock = p.stock_quantity ?? 0;
            const isOut = stock <= 0;
            const threshold = p.low_stock_threshold ?? 5;
            const sel = preset[p.id] ?? "1";
            const avail = availabilityState(p);
            const isExpired = avail === "expired";
            return (
              <li
                key={p.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center ${
                  isOut || isExpired ? "border-destructive/50" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3 sm:flex-1 sm:min-w-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Editar ${p.name}`}
                    title="Editar produto"
                    onClick={() => navigate(`/agricultor/produtos/${p.id}/editar`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {thumbs[p.id] ? (
                      <img src={thumbs[p.id]} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">por {p.unit}</p>
                    {avail === "none" ? (
                      <p className="mt-1 text-xs text-muted-foreground">Sem prazo de levantamento</p>
                    ) : (
                      <p
                        className={`mt-1 inline-flex items-center gap-1 text-xs ${
                          avail === "expired"
                            ? "font-medium text-destructive"
                            : avail === "ending"
                            ? "font-medium text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {p.availability_start && `${formatDate(p.availability_start)} – `}
                          {formatDate(p.availability_end!)}
                          {avail === "expired" && " · prazo terminado"}
                          {avail === "ending" &&
                            ` · termina ${
                              daysUntil(p.availability_end!) === 0
                                ? "hoje"
                                : `em ${daysUntil(p.availability_end!)} dia(s)`
                            }`}
                          {avail === "upcoming" && " · ainda não iniciado"}
                        </span>
                      </p>
                    )}
                  </div>
                </div>


                <div className="flex items-center gap-2 sm:w-32">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isOut
                        ? "bg-destructive/10 text-destructive"
                        : stock <= threshold
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isOut ? "Sem stock" : `${stock} em stock`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <select
                    value={sel}
                    onChange={(e) => setPreset((s) => ({ ...s, [p.id]: e.target.value }))}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    aria-label="Quantidade a adicionar"
                  >
                    {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                    <option value="100+">100+</option>
                  </select>
                  {sel === "100+" && (
                    <Input
                      type="number"
                      min={101}
                      step={1}
                      value={custom[p.id] ?? ""}
                      onChange={(e) =>
                        setCustom((s) => ({ ...s, [p.id]: e.target.value }))
                      }
                      placeholder="Nº exato"
                      className="h-9 w-28"
                    />
                  )}
                  <Button
                    size="icon"
                    onClick={() => applyStockDelta(p, 1)}
                    disabled={savingId === p.id}
                    className="h-8 w-8 shrink-0"
                    aria-label={`Adicionar stock a ${p.name}`}
                    title="Adicionar stock"
                  >
                    {savingId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => applyStockDelta(p, -1)}
                    disabled={savingId === p.id || stock <= 0}
                    className="h-8 w-8 shrink-0"
                    aria-label={`Retirar stock a ${p.name}`}
                    title="Retirar stock"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
};

export default MyProducts;
