/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AiDescriptionAssistant from "@/components/AiDescriptionAssistant";
import { toast } from "@/hooks/use-toast";
import { categories, categoryLabel } from "@/data/categories";
import { Checkbox } from "@/components/ui/checkbox";
import DeliveryModeFields from "@/components/DeliveryModeFields";
import { formatEuro } from "@/lib/format";
import {
  applyDeliveryDefaults,
  changedDeliveryFields,
  loadDeliveryDefaults,
  normalizeDeliverySettings,
  parseEuro,
  type DeliveryModeValue,
  type DeliverySettings,
} from "@/lib/delivery-defaults";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const COMMISSION = 0.10;

/** Taxas de IVA em Portugal continental. O agricultor escolhe a aplicável. */
const VAT_OPTIONS = [0, 6, 13, 23] as const;

const NewProduct = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useTranslation(["farmer", "common"]);
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
  const [vatRate, setVatRate] = useState<number>(6);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryModeValue>("pickup");
  // Prazo mínimo de preparação da entrega, em dias (products.shipping_days).
  const [shippingDays, setShippingDays] = useState<string>("");
  const [deliveryTracking, setDeliveryTracking] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [freeThreshold, setFreeThreshold] = useState("");
  const [savedThreshold, setSavedThreshold] = useState<number | null>(null);
  const [deliveryDefaults, setDeliveryDefaults] = useState<DeliverySettings | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [stockQuantity, setStockQuantity] = useState<string>("");
  const [stockExpiry, setStockExpiry] = useState<string>("");
  const [lowStockThreshold, setLowStockThreshold] = useState<string>("5");
  const [chooseLotOnSale, setChooseLotOnSale] = useState(false);
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
        toast({ title: i18n.t("farmer:productForm.profileError"), description: error.message, variant: "destructive" });
      }
      setFarmerId(data?.id ?? null);
      // Preenche o cartão "Entrega" com o padrão do agricultor, se existir.
      if (data?.id) {
        const defaults = await loadDeliveryDefaults(data.id);
        setDeliveryDefaults(defaults.settings);
        setSavedThreshold(defaults.freeDeliveryThreshold);
        if (defaults.freeDeliveryThreshold != null) {
          setFreeThreshold(String(defaults.freeDeliveryThreshold).replace(".", ","));
        }
        if (defaults.settings) {
          const s = defaults.settings;
          setDeliveryMode(s.delivery_mode);
          setDeliveryTracking(s.delivery_tracking);
          setShippingDays(s.shipping_days > 0 ? String(s.shipping_days) : "");
          setDeliveryFee(s.delivery_fee > 0 ? String(s.delivery_fee).replace(".", ",") : "");
        }
      }
      setLoadingFarmer(false);
    };
    load();
  }, [user, profile, navigate]);

  const farmerPriceNumber = useMemo(() => {
    const n = parseFloat(farmerPrice.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [farmerPrice]);

  const clientPrice = useMemo(
    () => Math.round(farmerPriceNumber * (1 + COMMISSION) * (1 + vatRate / 100) * 100) / 100,
    [farmerPriceNumber, vatRate]
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
      toast({ title: t("productForm.noFarmer"), variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: t("productForm.errName"), variant: "destructive" });
      return;
    }
    if (farmerPriceNumber <= 0) {
      toast({ title: t("productForm.errPrice"), variant: "destructive" });
      return;
    }
    const shippingDaysNum = shippingDays.trim() ? parseInt(shippingDays, 10) : 0;
    if (deliveryMode !== "pickup" && (!Number.isFinite(shippingDaysNum) || shippingDaysNum < 0)) {
      toast({ title: t("productForm.errPrepDays"), variant: "destructive" });
      return;
    }
    const feeNum = deliveryFee.trim() ? parseEuro(deliveryFee) : 0;
    const thresholdNum = freeThreshold.trim() ? parseEuro(freeThreshold) : null;
    if (feeNum === null || (freeThreshold.trim() && thresholdNum === null)) {
      toast({ title: t("productForm.errDelivery"), variant: "destructive" });
      return;
    }
    const settings = normalizeDeliverySettings({
      delivery_mode: deliveryMode,
      delivery_tracking: deliveryTracking,
      shipping_days: shippingDaysNum,
      delivery_fee: feeNum,
    });
    const stockNum = parseFloat(stockQuantity);
    if (!Number.isFinite(stockNum) || stockNum <= 0) {
      toast({ title: t("productForm.errStock"), variant: "destructive" });
      return;
    }
    // Todo o stock à venda tem validade (lote criado abaixo com add_stock_batch).
    const todayLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (!stockExpiry || stockExpiry < todayLocal) {
      toast({ title: t("productForm.errExpiry"), variant: "destructive" });
      return;
    }
    const pickupEnabled = deliveryMode !== "shipping";
    if (pickupEnabled && (!availabilityStart || !availabilityEnd)) {
      toast({ title: t("productForm.errAvailability"), variant: "destructive" });
      return;
    }
    if (pickupEnabled && availabilityEnd < availabilityStart) {
      toast({ title: t("productForm.errDates"), variant: "destructive" });
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

      // O produto é criado sem stock; o stock entra a seguir como lote com validade.
      const { data: created, error } = await supabase.from("products").insert({
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
        vat_rate: vatRate,
        media_urls: '{' + mediaUrls + '}',
        // Valores normalizados: sem entrega ao domicílio não há acompanhamento nem preço.
        ...settings,
        stock_quantity: 0,
        low_stock_threshold: Math.max(0, parseInt(lowStockThreshold, 10) || 0),
        choose_lot_on_sale: chooseLotOnSale,
        availability_start: pickupEnabled ? availabilityStart : null,
        availability_end: pickupEnabled ? availabilityEnd : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any).select("id").single();
      if (error) throw error;
      const { error: stockErr } = await supabase.rpc("add_stock_batch", {
        p_product_id: created.id,
        p_quantity: stockNum,
        p_expires_at: stockExpiry,
      });
      if (stockErr) {
        toast({
          title: t("productForm.createdNoStock"),
          description: `${stockErr.message} ${t("productForm.createdNoStockText")}`,
          variant: "destructive",
        });
        navigate("/agricultor/produtos");
        return;
      }

      // Padrão de entrega: com a opção marcada, grava os campos alterados (ou
      // todos, se ainda não havia padrão) e aplica-os aos restantes produtos.
      // O limite da entrega grátis é sempre do agricultor.
      const defaultsUpdate: Partial<DeliverySettings> & { free_delivery_threshold?: number | null } = {};
      if (saveAsDefault) {
        const fields = deliveryDefaults
          ? changedDeliveryFields(settings, deliveryDefaults)
          : (Object.keys(settings) as (keyof DeliverySettings)[]);
        for (const f of fields) Object.assign(defaultsUpdate, { [f]: settings[f] });
      }
      if (thresholdNum !== savedThreshold) defaultsUpdate.free_delivery_threshold = thresholdNum;
      if (Object.keys(defaultsUpdate).length > 0) {
        const defaultsErr = await applyDeliveryDefaults(farmerId, defaultsUpdate);
        if (defaultsErr) {
          toast({
            title: t("productForm.addedNoDefault"),
            description: defaultsErr.message,
            variant: "destructive",
          });
          navigate("/catalogo");
          return;
        }
      }

      toast({ title: t("productForm.added"), description: t("productForm.addedText") });
      navigate("/catalogo");
    } catch (err: any) {
      toast({ title: t("productForm.saveError"), description: err.message, variant: "destructive" });
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
        <p className="text-muted-foreground">{t("productForm.completeProfile")}</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding/agricultor")}>{t("editors.completeProfile")}</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("common:actions.back")}
      </button>
      <PageHeader
        className="mb-0"
        eyebrow={t("area")}
        title={t("common:menu.farmer.addProduct")}
        description={t("productForm.newDescription")}
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Media */}
        <Card className="p-5">
          <Label className="text-base">{t("productForm.media")}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t("productForm.mediaHint", { count: 8 })}</p>
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
                  aria-label={t("common:actions.remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {files.length < 8 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-secondary">
                <Upload className="h-5 w-5" />
                <span className="text-xs">{t("common:actions.add")}</span>
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
            <Label htmlFor="name">{t("productForm.name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("productForm.namePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("productForm.unit")}</Label>
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
                  placeholder={t("products.exact")}
                  className="w-32"
                />
              )}
              <span className="text-sm text-muted-foreground">{t("productForm.perUnit", { unit })}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t("productForm.category")}</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("productForm.chooseCategory")}</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.name}>{categoryLabel(c.slug)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("productForm.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={t("productForm.descriptionPlaceholder")}
            />
            <AiDescriptionAssistant
              kind="product"
              draft={description}
              facts={{
                Nome: name,
                Categoria: category,
                "Unidade de venda": unit,
                Biológico: isOrganic,
                "Sem lactose": isLactoseFree,
                Processamento: hasModifications ? modificationsDescription : "",
              }}
              files={files}
              onAccept={setDescription}
            />
          </div>
        </Card>

        {/* Properties */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">{t("productForm.properties")}</h2>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="organic" className="cursor-pointer">{t("productForm.organic")}</Label>
              <p className="text-xs text-muted-foreground">{t("productForm.organicHint")}</p>
            </div>
            <Switch id="organic" checked={isOrganic} onCheckedChange={setIsOrganic} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="lactose" className="cursor-pointer">{t("productForm.lactoseFree")}</Label>
              <p className="text-xs text-muted-foreground">{t("productForm.lactoseFreeHint")}</p>
            </div>
            <Switch id="lactose" checked={isLactoseFree} onCheckedChange={setIsLactoseFree} />
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="modified" className="cursor-pointer">{t("productForm.modified")}</Label>
                <p className="text-xs text-muted-foreground">{t("productForm.modifiedHint")}</p>
              </div>
              <Switch id="modified" checked={hasModifications} onCheckedChange={setHasModifications} />
            </div>
            {hasModifications && (
              <Textarea
                className="mt-3"
                rows={3}
                value={modificationsDescription}
                onChange={(e) => setModificationsDescription(e.target.value)}
                placeholder={t("productForm.modifiedPlaceholder")}
              />
            )}
          </div>
        </Card>

        {/* Delivery */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">{t("productForm.delivery")}</h2>
          <p className="text-xs text-muted-foreground">{t("productForm.deliveryHint")}</p>
          <DeliveryModeFields
            farmerId={farmerId}
            mode={deliveryMode}
            onModeChange={setDeliveryMode}
            tracking={deliveryTracking}
            onTrackingChange={setDeliveryTracking}
            fee={deliveryFee}
            onFeeChange={setDeliveryFee}
            freeThreshold={freeThreshold}
            onFreeThresholdChange={setFreeThreshold}
            preparationDays={shippingDays}
            onPreparationDaysChange={setShippingDays}
          />
          <label htmlFor="save-delivery-default" className="flex cursor-pointer items-start gap-3 rounded-lg bg-muted/40 p-3">
            <Checkbox
              id="save-delivery-default"
              checked={saveAsDefault}
              onCheckedChange={(v) => setSaveAsDefault(v === true)}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm font-medium">{t("productForm.saveDefault")}</div>
              <p className="text-xs text-muted-foreground">
                {deliveryDefaults ? t("productForm.saveDefaultUpdate") : t("productForm.saveDefaultNew")}
              </p>
            </div>
          </label>
        </Card>

        {/* Availability */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">{t("productForm.quantitySection")}</h2>
          <div className="space-y-2">
            <Label htmlFor="stock-qty">{t("productForm.stock")}</Label>
            <Input
              id="stock-qty"
              type="number"
              min="0"
              step="0.01"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder={t("productForm.stockPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("productForm.stockHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-expiry">{t("productForm.stockExpiry")}</Label>
            <Input
              id="stock-expiry"
              type="date"
              value={stockExpiry}
              onChange={(e) => setStockExpiry(e.target.value)}
              className="w-44"
            />
            <p className="text-xs text-muted-foreground">
              {t("productForm.stockExpiryHint")}
            </p>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="choose-lot" className="text-sm font-medium">{t("productForm.chooseLot")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("productForm.chooseLotHint")}
              </p>
            </div>
            <Switch id="choose-lot" checked={chooseLotOnSale} onCheckedChange={setChooseLotOnSale} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="low-stock">{t("productForm.lowStock")}</Label>
            <Input
              id="low-stock"
              type="number"
              min="0"
              step="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder={t("productForm.lowStockPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("productForm.lowStockHint")}
            </p>
          </div>
          {deliveryMode !== "shipping" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avail-start">{t("productForm.availFrom")}</Label>
                <Input
                  id="avail-start"
                  type="date"
                  value={availabilityStart}
                  onChange={(e) => setAvailabilityStart(e.target.value)}
                  max="2099-12-31"
                />
                <p className="text-xs text-muted-foreground">{t("productForm.availFromHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avail-end">{t("productForm.availTo")}</Label>
                <Input
                  id="avail-end"
                  type="date"
                  value={availabilityEnd}
                  onChange={(e) => setAvailabilityEnd(e.target.value)}
                  min={availabilityStart || undefined}
                  max="2099-12-31"
                />
                <p className="text-xs text-muted-foreground">{t("productForm.availToHint")}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Pricing */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium">{t("productForm.price")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="farmer-price">{t("productForm.farmerPrice")}</Label>
              <Input
                id="farmer-price"
                type="number"
                step="0.01"
                min="0"
                value={farmerPrice}
                onChange={(e) => setFarmerPrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">{t("productForm.farmerPriceHint", { unit: unit || t("productForm.unitFallback") })}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat">{t("productForm.vat")}</Label>
              <select
                id="vat"
                value={vatRate}
                onChange={(e) => setVatRate(parseInt(e.target.value, 10))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {VAT_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    {t(`productForm.vatOptions.${rate}`)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("productForm.vatHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("productForm.clientPrice")}</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-foreground">
                {formatEuro(clientPrice)} / {unit || t("productForm.unitShort")}
              </div>
              <p className="text-xs text-muted-foreground">{t("productForm.clientPriceHint", { commission: Math.round(COMMISSION * 100), vat: vatRate })}</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
            {t("common:actions.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {t("productForm.publish")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewProduct;
