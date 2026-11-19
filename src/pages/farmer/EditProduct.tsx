/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, History, Loader2, Save, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
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
import ProductHistoryDialog from "@/components/ProductHistoryDialog";
import AiDescriptionAssistant from "@/components/AiDescriptionAssistant";
import DeliveryModeFields from "@/components/DeliveryModeFields";
import DeliveryScopeDialog, { type DeliveryScope } from "@/components/DeliveryScopeDialog";
import {
  applyDeliveryDefaults,
  changedDeliveryFields,
  loadDeliveryDefaults,
  normalizeDeliverySettings,
  parseEuro,
  type DeliveryModeValue,
  type DeliverySettings,
} from "@/lib/delivery-defaults";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { categories, categoryLabel } from "@/data/categories";
import { formatEuro } from "@/lib/format";
import { Trans, useTranslation } from "react-i18next";

const COMMISSION = 0.1;
const VAT_OPTIONS = [
  { value: 0 },
  { value: 6 },
  { value: 13 },
  { value: 23 },
] as const;
const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 25, 30, 40, 50];

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useTranslation(["farmer", "common", "account"]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [farmerPrice, setFarmerPrice] = useState("");
  const [vatRate, setVatRate] = useState<number>(6);
  const [stockQuantity, setStockQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [chooseLotOnSale, setChooseLotOnSale] = useState(false);
  const [shippingDays, setShippingDays] = useState("");
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");
  const [isOrganic, setIsOrganic] = useState(false);
  const [isLactoseFree, setIsLactoseFree] = useState(false);
  // Fotografias já guardadas, para a IA escrever a descrição.
  const [mediaPaths, setMediaPaths] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryModeValue>("pickup");
  const [deliveryTracking, setDeliveryTracking] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [freeThreshold, setFreeThreshold] = useState("");
  const [savedThreshold, setSavedThreshold] = useState<number | null>(null);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  // Entrega tal como estava gravada, para saber se o agricultor a alterou.
  const [originalDelivery, setOriginalDelivery] = useState<DeliverySettings | null>(null);
  const [scopeFields, setScopeFields] = useState<(keyof DeliverySettings)[] | null>(null);

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
      setMediaPaths(p.media_urls ?? []);
      setCategory(p.category ?? "");
      setUnit(p.unit ?? "");
      setFarmerPrice(String(p.farmer_price ?? ""));
      setVatRate(Number(p.vat_rate ?? 6));
      setStockQuantity(String(p.stock_quantity ?? 0));
      setLowStockThreshold(String(p.low_stock_threshold ?? 5));
      setChooseLotOnSale(!!p.choose_lot_on_sale);
      setShippingDays(p.shipping_days != null ? String(p.shipping_days) : "");
      setAvailabilityStart(p.availability_start ?? "");
      setAvailabilityEnd(p.availability_end ?? "");
      setIsOrganic(!!p.is_organic);
      setIsLactoseFree(!!p.is_lactose_free);
      setDiscount(p.discount_percent ?? 0);
      setDeliveryMode(p.delivery_mode ?? "pickup");
      setDeliveryTracking(!!p.delivery_tracking);
      setDeliveryFee(Number(p.delivery_fee ?? 0) > 0 ? String(p.delivery_fee).replace(".", ",") : "");
      setOriginalDelivery(
        normalizeDeliverySettings({
          delivery_mode: p.delivery_mode ?? "pickup",
          delivery_tracking: !!p.delivery_tracking,
          shipping_days: Number(p.shipping_days ?? 0),
          delivery_fee: Number(p.delivery_fee ?? 0),
        }),
      );
      setFarmerId(farmer.id);
      const defaults = await loadDeliveryDefaults(farmer.id);
      setSavedThreshold(defaults.freeDeliveryThreshold);
      setFreeThreshold(
        defaults.freeDeliveryThreshold != null ? String(defaults.freeDeliveryThreshold).replace(".", ",") : "",
      );
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

  // Sem `scope`, valida e, se a entrega mudou, pergunta se é só para este
  // produto ou para todos; com `scope`, grava.
  const handleSave = async (scope?: DeliveryScope) => {
    if (!id || !farmerId) return;
    if (!name.trim()) {
      toast({ title: t("productForm.errName"), variant: "destructive" });
      return;
    }
    if (farmerPriceNumber <= 0) {
      toast({ title: t("productForm.errPrice"), variant: "destructive" });
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
      shipping_days: shippingDays ? parseInt(shippingDays, 10) || 0 : 0,
      delivery_fee: feeNum,
    });
    const changed = originalDelivery ? changedDeliveryFields(settings, originalDelivery) : [];
    if (changed.length > 0 && !scope) {
      setScopeFields(changed);
      return;
    }
    setScopeFields(null);
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
        // O stock não se grava aqui: é gerido por lotes (com validade) em "Os meus produtos".
        low_stock_threshold: Math.max(0, parseInt(lowStockThreshold, 10) || 0),
        choose_lot_on_sale: chooseLotOnSale,
        // Valores normalizados: sem entrega ao domicílio não há acompanhamento nem preço.
        ...settings,
        availability_start: availabilityStart || null,
        availability_end: availabilityEnd || null,
        is_organic: isOrganic,
        is_lactose_free: isLactoseFree,
        discount_percent: discount,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    if (error) {
      setSaving(false);
      toast({ title: t("availability.saveError"), description: error.message, variant: "destructive" });
      return;
    }

    // "Todos os produtos": os campos alterados passam a padrão e são aplicados
    // aos restantes produtos. O limite da entrega grátis é sempre do agricultor.
    const defaultsUpdate: Partial<DeliverySettings> & { free_delivery_threshold?: number | null } = {};
    if (scope === "all") {
      for (const f of changed) Object.assign(defaultsUpdate, { [f]: settings[f] });
    }
    if (thresholdNum !== savedThreshold) defaultsUpdate.free_delivery_threshold = thresholdNum;
    if (Object.keys(defaultsUpdate).length > 0) {
      const defaultsErr = await applyDeliveryDefaults(farmerId, defaultsUpdate);
      if (defaultsErr) {
        setSaving(false);
        toast({
          title: t("productForm.updatedNoDefault"),
          description: defaultsErr.message,
          variant: "destructive",
        });
        return;
      }
    }
    setSaving(false);
    toast({
      title: t("productForm.updated"),
      description: scope === "all" ? t("productForm.updatedAll") : t("productForm.updatedText"),
    });
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
      toast({ title: t("productForm.deleteError"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("productForm.deleted"), description: t("productForm.deletedText", { name }) });
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
        <p className="text-muted-foreground">{t("productForm.notFound")}</p>
        <Button className="mt-4" onClick={() => navigate("/agricultor/produtos")}>
          {t("productForm.backToProducts")}
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
        <ArrowLeft className="h-4 w-4" /> {t("common:actions.back")}
      </button>

      <PageHeader
        className="mb-0"
        eyebrow={t("area")}
        title={t("productForm.editTitle")}
        description={t("productForm.editDescription")}
        actions={
          <Button variant="outline" className="gap-2" onClick={() => setHistoryOpen(true)}>
            <History className="h-4 w-4" /> {t("products.history")}
          </Button>
        }
      />
      <DeliveryScopeDialog
        open={scopeFields !== null}
        fields={scopeFields ?? []}
        onChoose={(scope) => handleSave(scope)}
        onCancel={() => setScopeFields(null)}
      />
      <ProductHistoryDialog
        productId={id ?? null}
        productName={name}
        unit={unit}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <div className="mt-8 space-y-6">
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("productForm.name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">{t("productForm.unitLabel")}</Label>
            <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("productForm.unitPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t("productForm.categoryLabel")}</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("productForm.chooseCategory")}</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.name}>
                  {categoryLabel(c.slug)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("productForm.description")}</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              }}
              storedPaths={mediaPaths}
              onAccept={setDescription}
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-medium">{t("productForm.priceStock")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">{t("productForm.priceReceive")}</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={farmerPrice}
                onChange={(e) => setFarmerPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat">{t("productForm.vatLabel")}</Label>
              <select
                id="vat"
                value={vatRate}
                onChange={(e) => setVatRate(parseInt(e.target.value, 10))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {VAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(`productForm.vatOptions.${o.value}`)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("productForm.vatHintShort")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">{t("productForm.stockLabel")}</Label>
              <Input id="stock" value={stockQuantity} readOnly disabled />
              <p className="text-xs text-muted-foreground">
                <Trans
                  t={t}
                  i18nKey="productForm.stockElsewhere"
                  components={{ link: <Link to="/agricultor/produtos" className="text-primary underline-offset-4 hover:underline" /> }}
                />
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
                min={0}
                step={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("productForm.lowStockHintShort")}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <Trans
              t={t}
              i18nKey="productForm.clientPriceLine"
              values={{ vat: vatRate, price: formatEuro(clientPrice) }}
              components={{ b: <strong /> }}
            />
          </p>
        </Card>

        {/* Descontos */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="font-medium">{t("productForm.discounts")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("productForm.discountsHint")}
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
                {d === 0 ? t("productForm.noDiscount") : `-${d}%`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="discount" className="text-sm">
              {t("productForm.customDiscount")}
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
            <span className="text-sm text-muted-foreground">{t("productForm.maxDiscount")}</span>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            {t("productForm.discountedPrice")}{" "}
            {discount > 0 && (
              <span className="mr-2 text-muted-foreground line-through">{formatEuro(clientPrice)}</span>
            )}
            <strong className="text-primary">{formatEuro(finalPrice)}</strong>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-medium">{t("productForm.deliveryAvailability")}</h2>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">{t("history.fields.availability_start")}</Label>
              <Input
                id="start"
                type="date"
                value={availabilityStart}
                onChange={(e) => setAvailabilityStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">{t("history.fields.availability_end")}</Label>
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
          <h2 className="font-medium">{t("productForm.properties")}</h2>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="organic" className="cursor-pointer">
              {t("productForm.organic")}
            </Label>
            <Switch id="organic" checked={isOrganic} onCheckedChange={setIsOrganic} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="lactose" className="cursor-pointer">
              {t("productForm.lactoseFree")}
            </Label>
            <Switch id="lactose" checked={isLactoseFree} onCheckedChange={setIsLactoseFree} />
          </div>
        </Card>

        <Card className="border-destructive/40 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            <h2 className="font-medium text-destructive">{t("productForm.delete")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("productForm.deleteText")}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting || saving} className="gap-2">
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t("productForm.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("productForm.deleteConfirm", { name })}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("productForm.deleteText")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t("common:actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("productForm.deleting")}
                    </>
                  ) : (
                    t("productForm.delete")
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/agricultor/produtos")}>
            {t("common:actions.cancel")}
          </Button>
          <Button onClick={() => handleSave()} disabled={saving || deleting} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("account:profile.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProduct;
