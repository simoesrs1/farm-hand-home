import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Minus,
  Pencil,
  PackageOpen,
  ImageIcon,
  CalendarClock,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductHistoryDialog from "@/components/ProductHistoryDialog";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { pendingLotUnitsByProduct } from "@/lib/lot-allocations";

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

type Batch = {
  id: string;
  product_id: string;
  quantity_remaining: number;
  expires_at: string | null;
  added_at: string;
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
  const [historyProduct, setHistoryProduct] = useState<ProductRow | null>(null);
  const [expiry, setExpiry] = useState<Record<string, string>>({});
  const [batches, setBatches] = useState<Record<string, Batch[]>>({});
  const [pendingExpiry, setPendingExpiry] = useState<Record<string, string>>({});
  // Unidades vendidas à espera de o agricultor indicar o lote, por produto.
  const [awaitingLot, setAwaitingLot] = useState<Record<string, number>>({});

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
    // Remove automaticamente lotes fora de validade antes de mostrar o stock.
    await supabase.rpc("expire_stock_batches", {});
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, unit, stock_quantity, media_urls, availability_start, availability_end, client_price, discount_percent, low_stock_threshold"
      )
      .eq("farmer_id", farmer.id)
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) {
      toast({ title: "Erro a carregar produtos", description: error.message, variant: "destructive" });
    } else {
      setProducts((data ?? []) as ProductRow[]);
    }
    const { data: b } = await supabase
      .from("product_stock_batches")
      .select("id, product_id, quantity_remaining, expires_at, added_at")
      .eq("farmer_id", farmer.id)
      .gt("quantity_remaining", 0)
      .order("expires_at", { ascending: true, nullsFirst: false })
      .order("added_at", { ascending: true });
    const map: Record<string, Batch[]> = {};
    for (const row of (b ?? []) as Batch[]) (map[row.product_id] ??= []).push(row);
    setBatches(map);
    setAwaitingLot(await pendingLotUnitsByProduct());
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

  // Lote à espera de validade: com a data, as unidades voltam ao stock à venda.
  const confirmBatchExpiry = async (b: Batch) => {
    const date = pendingExpiry[b.id];
    if (!date) return;
    setSavingId(b.id);
    const { error } = await supabase.rpc("set_batch_expiry", { p_batch_id: b.id, p_expires_at: date });
    setSavingId(null);
    if (error) {
      toast({ title: "Não foi possível repor o stock", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Stock reposto à venda", description: `${b.quantity_remaining} un. com validade ${formatDate(date)}.` });
    setPendingExpiry((s) => ({ ...s, [b.id]: "" }));
    load();
  };

  const applyStockDelta = async (p: ProductRow, sign: 1 | -1) => {
    const amount = resolveAmount(p);
    if (amount <= 0) return;
    const current = p.stock_quantity ?? 0;
    if (sign === -1 && current <= 0) {
      toast({ title: "Sem stock para retirar", variant: "destructive" });
      return;
    }
    const exp = expiry[p.id] || null;
    // Todo o stock à venda tem validade.
    if (sign === 1 && !exp) {
      toast({ title: "Indique a validade do novo stock", variant: "destructive" });
      return;
    }
    if (sign === 1 && exp && exp < todayISO()) {
      toast({ title: "A validade não pode estar no passado", variant: "destructive" });
      return;
    }
    setSavingId(p.id);
    const { data, error } =
      sign === 1
        ? await supabase.rpc("add_stock_batch", { p_product_id: p.id, p_quantity: amount, p_expires_at: exp })
        : await supabase.rpc("remove_stock_fifo", { p_product_id: p.id, p_quantity: amount });
    setSavingId(null);
    if (error) {
      toast({ title: "Erro a atualizar stock", description: error.message, variant: "destructive" });
      return;
    }
    const newStock = Number(data ?? 0);
    toast({
      title: "Stock atualizado",
      description: `${p.name}: ${sign === 1 ? "+" : "−"}${amount} → ${newStock}`,
    });
    setPreset((s) => ({ ...s, [p.id]: "1" }));
    setCustom((s) => ({ ...s, [p.id]: "" }));
    setExpiry((s) => ({ ...s, [p.id]: "" }));
    load();
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

      <PageHeader
        className="mb-0"
        eyebrow="Área do agricultor"
        title="Os meus produtos"
        description="Gestão de stock dos artigos já publicados."
        actions={
          <Button asChild className="gap-2">
            <Link to="/agricultor/produtos/novo">
              <Plus className="h-4 w-4" /> Adicionar produto
            </Link>
          </Button>
        }
      />

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
            const datedBatches = (batches[p.id] ?? []).filter((b) => b.expires_at);
            const pendingBatches = (batches[p.id] ?? []).filter((b) => !b.expires_at);
            return (
              <li
                key={p.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center ${
                  isOut || isExpired ? "border-destructive/50" : "border-border"
                }`}
              >
                {/* 1. Cabeçalho: produto, estado do stock e ações */}
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {thumbs[p.id] ? (
                      <img src={thumbs[p.id]} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">por {p.unit}</p>
                  </div>
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
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 sm:flex-none"
                      onClick={() => navigate(`/agricultor/produtos/${p.id}/editar`)}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 sm:flex-none"
                      onClick={() => setHistoryProduct(p)}
                    >
                      <History className="h-4 w-4" /> Histórico
                    </Button>
                  </div>
                </div>

                {/* 2. Resumo: disponibilidade e stock */}
                <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Disponibilidade</p>
                    {avail === "none" ? (
                      <p className="mt-1 text-sm text-foreground">Sem prazo de levantamento</p>
                    ) : (
                      <p
                        className={`mt-1 inline-flex items-center gap-1.5 text-sm ${
                          avail === "expired"
                            ? "font-medium text-destructive"
                            : avail === "ending"
                            ? "font-medium text-warning"
                            : "text-muted-foreground"
                        }`}
                      >
                        <CalendarClock className="h-4 w-4 shrink-0" />
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
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success"
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
                  <Input
                    type="date"
                    min={todayISO()}
                    value={expiry[p.id] ?? ""}
                    onChange={(e) => setExpiry((s) => ({ ...s, [p.id]: e.target.value }))}
                    className="h-9 w-36"
                    aria-label="Validade do novo stock"
                    title="Validade do novo stock (obrigatória)"
                  />
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

                {(batches[p.id] ?? []).some((b) => b.expires_at) && (
                  <div className="w-full border-t border-border pt-2 text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">
                      Lotes em stock (vende-se primeiro o mais antigo)
                    </p>
                    {(awaitingLot[p.id] ?? 0) > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {awaitingLot[p.id]} {p.unit} vendidas à espera de indicação do lote (ainda contam nos lotes).
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Atualizar stock */}
                <div className="border-t border-border p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Atualizar stock</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`qty-${p.id}`} className="text-xs text-muted-foreground">Quantidade</Label>
                      <select
                        id={`qty-${p.id}`}
                        value={sel}
                        onChange={(e) => setPreset((s) => ({ ...s, [p.id]: e.target.value }))}
                        className="block h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={String(n)}>
                            {n}
                          </option>
                        ))}
                        <option value="100+">100+</option>
                      </select>
                    </div>
                    {sel === "100+" && (
                      <div className="space-y-1">
                        <Label htmlFor={`custom-${p.id}`} className="text-xs text-muted-foreground">Nº exato</Label>
                        <Input
                          id={`custom-${p.id}`}
                          type="number"
                          min={101}
                          step={1}
                          value={custom[p.id] ?? ""}
                          onChange={(e) => setCustom((s) => ({ ...s, [p.id]: e.target.value }))}
                          placeholder="Ex.: 150"
                          className="h-9 w-28"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor={`exp-${p.id}`} className="text-xs text-muted-foreground">
                        Validade (para adicionar)
                      </Label>
                      <Input
                        id={`exp-${p.id}`}
                        type="date"
                        min={todayISO()}
                        value={expiry[p.id] ?? ""}
                        onChange={(e) => setExpiry((s) => ({ ...s, [p.id]: e.target.value }))}
                        className="h-9 w-40"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => applyStockDelta(p, 1)}
                        disabled={savingId === p.id}
                        className="h-9 gap-1.5"
                      >
                        {savingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Adicionar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyStockDelta(p, -1)}
                        disabled={savingId === p.id || stock <= 0}
                        className="h-9 gap-1.5"
                      >
                        <Minus className="h-4 w-4" /> Retirar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 4. Lotes em stock: sempre visível, pela validade que termina primeiro
                    (é também o primeiro a ser vendido). */}
                <div className="border-t border-border p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Lotes em stock <span className="font-normal text-muted-foreground">(vende-se primeiro o que termina primeiro)</span>
                  </p>
                  {datedBatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem lotes em stock.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                      {datedBatches.map((b, i) => {
                        const days = daysUntil(b.expires_at!);
                        return (
                          <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                            <span className="w-28 shrink-0 text-xs font-semibold text-primary">{i === 0 ? "Vende-se primeiro" : ""}</span>
                            <span className="font-medium text-foreground">{b.quantity_remaining} {p.unit}</span>
                            <span className="text-foreground">Validade {formatDate(b.expires_at!)}</span>
                            <span
                              className={`text-xs ${
                                days <= 0
                                  ? "font-semibold text-destructive"
                                  : days <= 7
                                  ? "font-medium text-amber-700 dark:text-amber-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {days <= 0 ? "termina hoje" : days === 1 ? "termina amanhã" : `termina em ${days} dias`}
                            </span>
                            <span className="text-xs text-muted-foreground">Inserido {new Date(b.added_at).toLocaleDateString("pt-PT")}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* 5. Lotes sem validade: fora do stock à venda até o agricultor indicar a data. */}
                {pendingBatches.length > 0 && (
                  <div className="border-t border-border bg-muted/30 p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">
                      À espera de validade <span className="font-normal text-muted-foreground">(fora do stock à venda)</span>
                    </p>
                    <ul className="space-y-2">
                      {pendingBatches.map((b) => (
                        <li key={b.id} className="flex flex-wrap items-end gap-3">
                          <span className="pb-2 text-sm font-medium text-foreground">{b.quantity_remaining} {p.unit}</span>
                          <div className="space-y-1">
                            <Label htmlFor={`pending-${b.id}`} className="text-xs text-muted-foreground">Validade</Label>
                            <Input
                              id={`pending-${b.id}`}
                              type="date"
                              min={todayISO()}
                              value={pendingExpiry[b.id] ?? ""}
                              onChange={(e) => setPendingExpiry((s) => ({ ...s, [b.id]: e.target.value }))}
                              className="h-9 w-40"
                            />
                          </div>
                          <Button
                            size="sm"
                            className="h-9"
                            disabled={!pendingExpiry[b.id] || savingId === b.id}
                            onClick={() => confirmBatchExpiry(b)}
                          >
                            Repor à venda
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ProductHistoryDialog
        productId={historyProduct?.id ?? null}
        productName={historyProduct?.name}
        unit={historyProduct?.unit}
        open={historyProduct !== null}
        onOpenChange={(open) => !open && setHistoryProduct(null)}
      />
    </div>
  );
};

export default MyProducts;
