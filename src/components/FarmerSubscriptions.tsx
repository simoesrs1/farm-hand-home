import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, Loader2, MapPin, Repeat, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DeliveryPointPicker from "@/components/DeliveryPointPicker";
import TranslatedText from "@/components/TranslatedText";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isWithinDeliveryRadius } from "@/lib/fulfillment";
import { formatEuro, formatNumber } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import {
  billingLabel,
  CANCEL_CUTOFF_HOURS,
  deliveriesPerPeriod,
  deliveryLabel,
  includesList,
  isInterval,
  type SubscriptionPlan,
} from "@/lib/subscriptions";

/** "O que inclui": uma linha por artigo, traduzida pela IA como um só texto. */
const PlanIncludes = ({ plan }: { plan: SubscriptionPlan }) => {
  const { text } = useTranslatedContent("subscription", plan.id, "includes", plan.includes);
  const items = includesList(text);
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 grid gap-1 text-sm text-foreground sm:grid-cols-2">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-1.5">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {it}
        </li>
      ))}
    </ul>
  );
};

interface FarmerSubscriptionsProps {
  farmerId: string;
  farmName: string;
  isOwner: boolean;
}

/**
 * Secção "Subscrições" do perfil público do agricultor: um botão que abre um
 * balão com os planos e, ao escolher um, a morada e o ponto de entrega.
 */
const FarmerSubscriptions = ({ farmerId, farmName, isOwner }: FarmerSubscriptionsProps) => {
  const { t } = useTranslation(["offerings", "common", "cart"]);
  const { user, activeMode } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [farmPoint, setFarmPoint] = useState<LatLng | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<LatLng | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: planRows }, { data: farm }] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select("*")
          .eq("farmer_id", farmerId)
          .eq("active", true)
          .order("price", { ascending: true }),
        supabase.from("public_farmer_profiles").select("pickup_lat, pickup_lng").eq("id", farmerId).maybeSingle(),
      ]);
      if (cancelled) return;
      setPlans(planRows ?? []);
      setFarmPoint(
        farm?.pickup_lat != null && farm?.pickup_lng != null ? { lat: Number(farm.pickup_lat), lng: Number(farm.pickup_lng) } : null,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [farmerId]);

  const outOfRadius = useMemo(
    () =>
      !!selected && !!point && !!farmPoint && !isWithinDeliveryRadius(farmPoint, point, Number(selected.delivery_radius_km)),
    [selected, point, farmPoint],
  );

  if (plans.length === 0) return null;

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) setSelected(null);
  };

  const subscribe = async () => {
    if (!selected) return;
    if (!user) {
      toast({ title: t("cart:toast.login"), description: t("subscriptions.loginText") });
      navigate("/auth");
      return;
    }
    if (activeMode === "vendedor") {
      toast({ title: t("cart:toast.farmerMode"), description: t("cart:toast.farmerModeText"), variant: "destructive" });
      return;
    }
    if (address.trim().length < 5) {
      toast({ title: t("cart:toast.noAddress"), description: t("cart:toast.noAddressText"), variant: "destructive" });
      return;
    }
    if (!point) {
      toast({ title: t("cart:toast.noPoint"), description: t("cart:toast.noPointText"), variant: "destructive" });
      return;
    }
    if (outOfRadius) {
      toast({
        title: t("cart:toast.outOfRadius"),
        description: t("subscriptions.outOfRadius", { km: formatNumber(Number(selected.delivery_radius_km)) }),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("subscribe_to_plan", {
      p_plan_id: selected.id,
      p_address: address.trim(),
      p_lat: point.lat,
      p_lng: point.lng,
    });
    setSaving(false);
    if (error) {
      // A mensagem do servidor é traduzida no toast (server-messages).
      toast({ title: t("subscriptions.failed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("subscriptions.done"), description: t("subscriptions.doneText", { title: selected.title }) });
    close(false);
    navigate("/encomendas");
  };

  const billing = selected && isInterval(selected.billing_interval) ? selected.billing_interval : "month";
  const delivery = selected && isInterval(selected.delivery_interval) ? selected.delivery_interval : "week";
  const perPeriod = deliveriesPerPeriod(billing, delivery);

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">{t("subscriptions.sectionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subscriptions.sectionText", { count: plans.length })}</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Repeat className="h-4 w-4" /> {t("subscriptions.button")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? selected.title : t("subscriptions.dialogTitle", { farm: farmName })}</DialogTitle>
            <DialogDescription>
              {selected ? t("subscriptions.subscribeText") : t("subscriptions.dialogText")}
            </DialogDescription>
          </DialogHeader>

          {!selected ? (
            <ul className="space-y-3">
              {plans.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-foreground">
                        <TranslatedText type="subscription" id={p.id} field="title" text={p.title} />
                      </h3>
                      <p className="font-mono text-lg font-bold tabular-nums text-primary">
                        {formatEuro(Number(p.price))}
                        <span className="text-xs font-normal text-muted-foreground"> {billingLabel(p.billing_interval)}</span>
                      </p>
                    </div>
                    <TranslatedText
                      type="subscription"
                      id={p.id}
                      field="description"
                      text={p.description}
                      as="p"
                      className="mt-1 text-sm text-muted-foreground"
                    />
                    <PlanIncludes plan={p} />
                    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" /> {deliveryLabel(p.delivery_interval)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {t("subscriptions.radius", { km: formatNumber(Number(p.delivery_radius_km)) })}
                      </span>
                    </p>
                    {!isOwner && (
                      <Button size="sm" className="mt-3" onClick={() => setSelected(p)}>
                        {t("subscriptions.choose")}
                      </Button>
                    )}
                  </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> {t("subscriptions.backToPlans")}
              </button>

              {/* Informação antes do contrato: preço, periodicidade, entregas e cancelamento. */}
              <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("subscriptions.priceLabel")}</dt>
                  <dd className="font-medium text-foreground">
                    {formatEuro(Number(selected.price))} {billingLabel(selected.billing_interval)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("subscriptions.deliveriesLabel")}</dt>
                  <dd className="font-medium text-foreground">
                    {deliveryLabel(selected.delivery_interval)} · {t("subscriptions.perPeriod", { count: perPeriod })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("subscriptions.firstDeliveryLabel")}</dt>
                  <dd className="font-medium text-foreground">
                    {t("subscriptions.firstDelivery", { count: selected.preparation_days })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("subscriptions.cancelLabel")}</dt>
                  <dd className="font-medium text-foreground">{t("subscriptions.cancelText", { hours: CANCEL_CUTOFF_HOURS })}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <Label htmlFor="subscription-address">{t("cart:address")}</Label>
                <Input
                  id="subscription-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("cart:addressPlaceholder")}
                />
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setMapOpen(true)}>
                  <MapPin className="h-4 w-4" /> {point ? t("cart:pointChange") : t("cart:pointMark")}
                </Button>
                {point && (
                  <p className="text-[11px] text-muted-foreground">
                    {t("cart:point", { coords: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` })}
                  </p>
                )}
                {outOfRadius && (
                  <p className="text-[11px] font-medium text-destructive">
                    {t("subscriptions.outOfRadius", { km: formatNumber(Number(selected.delivery_radius_km)) })}
                  </p>
                )}
              </div>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("subscriptions.billingNote")}
              </p>

              <Button className="w-full" size="lg" onClick={subscribe} disabled={saving || outOfRadius}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("subscriptions.confirm", { price: formatEuro(Number(selected.price)) })}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeliveryPointPicker open={mapOpen} onOpenChange={setMapOpen} value={point} onConfirm={setPoint} />
    </section>
  );
};

export default FarmerSubscriptions;
