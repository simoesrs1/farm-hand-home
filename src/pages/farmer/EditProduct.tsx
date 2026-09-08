/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { categories } from "@/data/categories";

const COMMISSION = 0.1;
const VAT_OPTIONS = [
  { value: 0, label: "Isento / não aplicável (0%)" },
  { value: 6, label: "Reduzida — 6%" },
  { value: 13, label: "Intermédia — 13%" },
  { value: 23, label: "Normal — 23%" },
];
const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 25, 30, 40, 50];
const DELIVERY_OPTIONS = [
  { value: "pickup", label: "Levantamento na quinta", hint: "O cliente vai buscar a encomenda." },
  { value: "shipping", label: "Envio de encomenda", hint: "Entrega ao domicílio por transportadora." },
  { value: "both", label: "Ambos", hint: "Levantamento ou envio, à escolha do cliente." },
];

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [farmerPrice, setFarmerPrice] = useState("");
  const [vatRate, setVatRate] = useState<number>(6);
  const [stockQuantity, setStockQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [shippingDays, setShippingDays] = useState("");
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");
  const [isOrganic, setIsOrganic] = useState(false);
  const [isLactoseFree, setIsLactoseFree] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<string>("pickup");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile && profile.profile_type !== "vendedor") navigate("/");
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoading(true);
      const { data: farmer } = await supabase
        .from("farmer_details")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data || !farmer || data.farmer_id !== farmer.id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const p = data as any;
      setName(p.name ?? "");
      setDescription(p.description ?? "");
      setCategory(p.category ?? "");
      setUnit(p.unit ?? "");
      setFarmerPrice(String(p.farmer_price ?? ""));
      setVatRate(Number(p.vat_rate ?? 6));
      setStockQuantity(String(p.stock_quantity ?? 0));
      setLowStockThreshold(String(p.low_stock_threshold ?? 5));
      setShippingDays(p.shipping_days != null ? String(p.shipping_days) : "");
      setAvailabilityStart(p.availability_start ?? "");
      setAvailabilityEnd(p.availability_end ?? "");
      setIsOrganic(!!p.is_organic);
      setIsLactoseFree(!!p.is_lactose_free);
      setDiscount(p.discount_percent ?? 0);
      setDeliveryMode(p.delivery_mode ?? "pickup");
      setLoading(false);
    })();
  }, [user, id]);

  const farmerPriceNumber = useMemo(() => {
    const n = parseFloat(farmerPrice.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [farmerPrice]);

  const clientPrice = useMemo(
    () => Math.round(farmerPriceNumber * (1 + COMMISSION) * (1 + vatRate / 100) * 100) / 100,
    [farmerPriceNumber, vatRate],
  );
  const finalPrice = useMemo(
    () => Math.round(clientPrice * (1 - discount / 100) * 100) / 100,
    [clientPrice, discount],
  );

  const handleSave = async () => {
    if (!id) return;
    if (!name.trim()) {
      toast({ title: "Indique o nome do produto", variant: "destructive" });
      return;
    }
    if (farmerPriceNumber <= 0) {
      toast({ title: "Defina um preço válido", variant: "destructive" });
      return;
    }
    const stockNum = parseInt(stockQuantity, 10);
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        unit: unit.trim() || "Kg",
        farmer_price: farmerPriceNumber,
        client_price: clientPrice,
        vat_rate: vatRate,
        stock_quantity: stockNum,
        low_stock_threshold: Math.max(0, parseInt(lowStockThreshold, 10) || 0),
        delivery_mode: deliveryMode,
        shipping_days:
          deliveryMode === "pickup" ? 0 : shippingDays ? parseInt(shippingDays, 10) : 1,
        availability_start: availabilityStart || null,
        availability_end: availabilityEnd || null,
        is_organic: isOrganic,
        is_lactose_free: isLactoseFree,
        discount_percent: discount,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro a guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Produto atualizado", description: "As alterações já estão visíveis no catálogo." });
    navigate("/agricultor/produtos");
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const { error } = await supabase
      .from("products")
      .update({ active: false, stock_quantity: 0 } as any)
      .eq("id", id);
    setDeleting(false);
    if (error) {
      toast({ title: "Erro a eliminar produto", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Produto eliminado", description: `${name} foi removido do catálogo.` });
    navigate("/agricultor/produtos");
  };

  if (authLoading || loading) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Button className="mt-4" onClick={() => navigate("/agricultor/produtos")}>
          Voltar aos meus produtos
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="font-display text-3xl font-bold text-foreground">Editar produto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Atualize as informações do artigo e aplique descontos.
      </p>

      <div className="mt-8 space-y-6">
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do produto *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unidade de venda</Label>
            <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ex: 1 Kg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Preço e stock</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Preço que recebe (€) *</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={farmerPrice}
                onChange={(e) => setFarmerPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat">Taxa de IVA a cobrar</Label>
              <select
                id="vat"
                value={vatRate}
                onChange={(e) => setVatRate(parseInt(e.target.value, 10))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {VAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Informe-se previamente sobre a taxa correta — a responsabilidade fiscal é do agricultor.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Quantidade disponível (nº de produtos)</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                step={1}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="low-stock">Avisar quando o stock chegar a</Label>
              <Input
                id="low-stock"
                type="number"
                min={0}
                step={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Recebe uma notificação quando as unidades disponíveis descerem até este valor.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Preço ao cliente (com comissão de 10% e IVA de {vatRate}%): <strong>{clientPrice.toFixed(2)} €</strong>
          </p>
        </Card>

        {/* Descontos */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="font-medium">Descontos</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Aplique uma promoção ao produto. O desconto incide sobre o preço final ao cliente.
          </p>
          <div className="flex flex-wrap gap-2">
            {DISCOUNT_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiscount(d)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  discount === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-secondary"
                }`}
              >
                {d === 0 ? "Sem desconto" : `-${d}%`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="discount" className="text-sm">
              Valor personalizado (%)
            </Label>
            <Input
              id="discount"
              type="number"
              min={0}
              max={90}
              step={1}
              value={discount}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setDiscount(Number.isFinite(n) ? Math.min(90, Math.max(0, n)) : 0);
              }}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">Máximo 90%</span>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            Preço com desconto:{" "}
            {discount > 0 && (
              <span className="mr-2 text-muted-foreground line-through">{clientPrice.toFixed(2)} €</span>
            )}
            <strong className="text-primary">{finalPrice.toFixed(2)} €</strong>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Entrega e disponibilidade</h2>
          <div className="space-y-2">
            <Label>Forma de entrega</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {DELIVERY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setDeliveryMode(o.value)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    deliveryMode === o.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-secondary"
                  }`}
                >
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
          {deliveryMode !== "pickup" && (
            <div className="space-y-2">
              <Label htmlFor="days">Dias de envio</Label>
              <Input
                id="days"
                type="number"
                min={1}
                value={shippingDays}
                onChange={(e) => setShippingDays(e.target.value)}
                className="w-32"
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Início da disponibilidade</Label>
              <Input
                id="start"
                type="date"
                value={availabilityStart}
                onChange={(e) => setAvailabilityStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fim da disponibilidade</Label>
              <Input
                id="end"
                type="date"
                value={availabilityEnd}
                onChange={(e) => setAvailabilityEnd(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Características</h2>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="organic" className="cursor-pointer">
              Biológico
            </Label>
            <Switch id="organic" checked={isOrganic} onCheckedChange={setIsOrganic} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="lactose" className="cursor-pointer">
              Sem lactose
            </Label>
            <Switch id="lactose" checked={isLactoseFree} onCheckedChange={setIsLactoseFree} />
          </div>
        </Card>

        <Card className="border-destructive/40 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            <h2 className="font-medium text-destructive">Eliminar produto</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            O produto deixa de aparecer no catálogo e na sua lista de produtos publicados. Esta ação
            não pode ser anulada.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting || saving} className="gap-2">
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar produto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar “{name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  O produto deixa de aparecer no catálogo e na sua lista de produtos publicados.
                  Esta ação não pode ser anulada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A eliminar…
                    </>
                  ) : (
                    "Eliminar produto"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/agricultor/produtos")}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || deleting} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar alterações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProduct;
