import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { categories } from "@/data/categories";

const COMMISSION = 0.10;

const NewProduct = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [loadingFarmer, setLoadingFarmer] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [measure, setMeasure] = useState<"Kg" | "g" | "L" | "mL">("Kg");
  const [qtyPreset, setQtyPreset] = useState<string>("1");
  const [qtyCustom, setQtyCustom] = useState<string>("");
  const qtyNumber = qtyPreset === "100+"
    ? (parseInt(qtyCustom, 10) > 100 ? parseInt(qtyCustom, 10) : 0)
    : parseInt(qtyPreset, 10) || 0;
  const unit = qtyNumber > 0 ? `${qtyNumber} ${measure}` : measure;
  const [isOrganic, setIsOrganic] = useState(false);
  const [isLactoseFree, setIsLactoseFree] = useState(false);
  const [hasModifications, setHasModifications] = useState(false);
  const [modificationsDescription, setModificationsDescription] = useState("");
  const [farmerPrice, setFarmerPrice] = useState<string>("");
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "shipping" | "both">("pickup");
  const [shippingDays, setShippingDays] = useState<string>("");
  const [stockQuantity, setStockQuantity] = useState<string>("");
  const [availabilityStart, setAvailabilityStart] = useState<string>("");
  const [availabilityEnd, setAvailabilityEnd] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile && profile.profile_type !== "vendedor") {
      navigate("/");
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from("farmer_details")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Erro a carregar perfil", description: error.message, variant: "destructive" });
      }
      setFarmerId(data?.id ?? null);
      setLoadingFarmer(false);
    };
    load();
  }, [user, profile, navigate]);

  const farmerPriceNumber = useMemo(() => {
    const n = parseFloat(farmerPrice.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [farmerPrice]);

  const clientPrice = useMemo(
    () => Math.round(farmerPriceNumber * (1 + COMMISSION) * 100) / 100,
    [farmerPriceNumber]
  );

  const handleFilesAdd = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setFiles((prev) => [...prev, ...incoming].slice(0, 8));
  };

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !farmerId) {
      toast({ title: "Perfil de agricultor não encontrado", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Indique o nome do produto", variant: "destructive" });
      return;
    }
    if (farmerPriceNumber <= 0) {
      toast({ title: "Defina um preço válido", variant: "destructive" });
      return;
    }
    const shippingDaysNum = parseInt(shippingDays, 10);
    if ((deliveryMode === "shipping" || deliveryMode === "both") && (!Number.isFinite(shippingDaysNum) || shippingDaysNum <= 0)) {
      toast({ title: "Indique os dias de envio", variant: "destructive" });
      return;
    }
    const stockNum = parseFloat(stockQuantity);
    if (!Number.isFinite(stockNum) || stockNum <= 0) {
      toast({ title: "Indique a quantidade disponível", variant: "destructive" });
      return;
    }
    const pickupEnabled = deliveryMode === "pickup" || deliveryMode === "both";
    if (pickupEnabled && (!availabilityStart || !availabilityEnd)) {
      toast({ title: "Indique as datas de disponibilidade para levantamento", variant: "destructive" });
      return;
    }
    if (pickupEnabled && availabilityEnd < availabilityStart) {
      toast({ title: "A data de fim deve ser posterior à data de início", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const mediaUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-media")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        mediaUrls.push(path);
      }

      const { error } = await supabase.from("products").insert({
        farmer_id: farmerId,
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        unit,
        is_organic: isOrganic,
        is_lactose_free: isLactoseFree,
        has_modifications: hasModifications,
        modifications_description: hasModifications
          ? modificationsDescription.trim() || null
          : null,
        farmer_price: farmerPriceNumber,
        client_price: clientPrice,
        media_urls: mediaUrls,
        delivery_mode: deliveryMode,
        shipping_days: deliveryMode === "pickup" ? null : shippingDaysNum,
        stock_quantity: stockNum,
        availability_start: pickupEnabled ? availabilityStart : null,
        availability_end: pickupEnabled ? availabilityEnd : null,
      } as any);
      if (error) throw error;

      toast({ title: "Produto adicionado", description: "O artigo está agora disponível." });
      navigate("/catalogo");
    } catch (err: any) {
      toast({ title: "Erro a guardar produto", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingFarmer) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">Complete o registo de agricultor para adicionar produtos.</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding/agricultor")}>Completar perfil</Button>
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
      <h1 className="font-display text-3xl font-bold text-foreground">Adicionar produto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha os detalhes do artigo que pretende colocar à venda.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Media */}
        <Card className="p-5">
          <Label className="text-base">Fotografias e vídeos</Label>
          <p className="text-xs text-muted-foreground mt-1">Até 8 ficheiros (imagens ou vídeos).</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {files.map((file, i) => (
              <div key={i} className="relative aspect-square rounded-lg border border-border bg-muted overflow-hidden">
                {file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                ) : (
                  <video src={URL.createObjectURL(file)} className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 rounded-md bg-background/90 p-1 text-destructive hover:bg-background"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {files.length < 8 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-secondary">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Adicionar</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleFilesAdd(e.target.files)}
                />
              </label>
            )}
          </div>
        </Card>

        {/* Basic */}
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do produto *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Tomate cherry" />
          </div>
          <div className="space-y-2">
            <Label>Unidade de venda *</Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                {(["Kg", "g", "L", "mL"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMeasure(m)}
                    className={`px-3 py-2 text-sm transition-colors ${
                      measure === m ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <select
                value={qtyPreset}
                onChange={(e) => setQtyPreset(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>{n}</option>
                ))}
                <option value="100+">100+</option>
              </select>
              {qtyPreset === "100+" && (
                <Input
                  type="number"
                  min="101"
                  step="1"
                  value={qtyCustom}
                  onChange={(e) => setQtyCustom(e.target.value)}
                  placeholder="Nº exato"
                  className="w-32"
                />
              )}
              <span className="text-sm text-muted-foreground">= {unit} por unidade</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Conte mais sobre o produto, origem, sabor, como é cultivado..."
            />
          </div>
        </Card>

        {/* Properties */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Características</h2>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="organic" className="cursor-pointer">Biológico</Label>
              <p className="text-xs text-muted-foreground">Cultivado sem químicos sintéticos.</p>
            </div>
            <Switch id="organic" checked={isOrganic} onCheckedChange={setIsOrganic} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="lactose" className="cursor-pointer">Sem lactose</Label>
              <p className="text-xs text-muted-foreground">Indique se o produto não contém lactose.</p>
            </div>
            <Switch id="lactose" checked={isLactoseFree} onCheckedChange={setIsLactoseFree} />
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="modified" className="cursor-pointer">Foi alterado / processado</Label>
                <p className="text-xs text-muted-foreground">Ex: pasteurizado, fermentado, seco.</p>
              </div>
              <Switch id="modified" checked={hasModifications} onCheckedChange={setHasModifications} />
            </div>
            {hasModifications && (
              <Textarea
                className="mt-3"
                rows={3}
                value={modificationsDescription}
                onChange={(e) => setModificationsDescription(e.target.value)}
                placeholder="Descreva o que foi feito ao produto."
              />
            )}
          </div>
        </Card>

        {/* Delivery */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Entrega</h2>
          <p className="text-xs text-muted-foreground">Escolha como o cliente pode receber o produto.</p>
          <RadioGroup value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as any)} className="gap-2">
            <label htmlFor="dm-pickup" className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/50">
              <RadioGroupItem value="pickup" id="dm-pickup" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Apenas levantamento na propriedade</div>
                <p className="text-xs text-muted-foreground">O cliente vai buscar à sua exploração.</p>
              </div>
            </label>
            <label htmlFor="dm-shipping" className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/50">
              <RadioGroupItem value="shipping" id="dm-shipping" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Apenas envio ao domicílio</div>
                <p className="text-xs text-muted-foreground">Faz sempre entrega em casa do cliente.</p>
              </div>
            </label>
            <label htmlFor="dm-both" className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/50">
              <RadioGroupItem value="both" id="dm-both" className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Ambos (levantamento ou envio)</div>
                <p className="text-xs text-muted-foreground">O cliente escolhe a opção.</p>
              </div>
            </label>
          </RadioGroup>
          {(deliveryMode === "shipping" || deliveryMode === "both") && (
            <div className="space-y-2">
              <Label htmlFor="shipping-days">Dias estimados para entrega em casa *</Label>
              <Input
                id="shipping-days"
                type="number"
                min="1"
                step="1"
                value={shippingDays}
                onChange={(e) => setShippingDays(e.target.value)}
                placeholder="Ex: 3"
              />
              <p className="text-xs text-muted-foreground">Número médio de dias úteis até o produto chegar ao cliente.</p>
            </div>
          )}
        </Card>

        {/* Availability */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Quantidade e disponibilidade</h2>
          <div className="space-y-2">
            <Label htmlFor="stock-qty">Quantidade disponível (nº de produtos) *</Label>
            <Input
              id="stock-qty"
              type="number"
              min="0"
              step="0.01"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="Ex: 25"
            />
            <p className="text-xs text-muted-foreground">Total disponível para venda desta publicação.</p>
          </div>
          {(deliveryMode === "pickup" || deliveryMode === "both") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avail-start">Disponível a partir de *</Label>
                <Input
                  id="avail-start"
                  type="date"
                  value={availabilityStart}
                  onChange={(e) => setAvailabilityStart(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Primeiro dia em que o cliente pode levantar.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avail-end">Disponível até *</Label>
                <Input
                  id="avail-end"
                  type="date"
                  value={availabilityEnd}
                  onChange={(e) => setAvailabilityEnd(e.target.value)}
                  min={availabilityStart || undefined}
                />
                <p className="text-xs text-muted-foreground">Último dia disponível para levantamento.</p>
              </div>
            </div>
          )}
        </Card>

        {/* Pricing */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Preço</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farmer-price">Quanto quer receber (€) *</Label>
              <Input
                id="farmer-price"
                type="number"
                step="0.01"
                min="0"
                value={farmerPrice}
                onChange={(e) => setFarmerPrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Valor que recebe por {unit || "unidade"}.</p>
            </div>
            <div className="space-y-2">
              <Label>Preço final para o cliente</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-foreground">
                {clientPrice.toFixed(2)} € / {unit || "un"}
              </div>
              <p className="text-xs text-muted-foreground">Inclui {Math.round(COMMISSION * 100)}% da FarmConnect.</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Publicar produto
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewProduct;
