import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Pencil, Plus, Repeat, Truck, Users, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatEuro, formatNumber } from "@/lib/format";
import { LEGAL } from "@/lib/legal";
import {
  billingLabel,
  deliveriesPerPeriod,
  deliveryLabel,
  isInterval,
  pricePerDelivery,
  SUBSCRIPTION_INTERVALS,
  validatePlan,
  type PlanFormErrors,
  type PlanFormValues,
  type Subscription,
  type SubscriptionInterval,
  type SubscriptionPlan,
} from "@/lib/subscriptions";

const EMPTY_FORM: PlanFormValues = {
  title: "",
  description: "",
  includes: "",
  price: "",
  billingInterval: "month",
  deliveryInterval: "week",
  preparationDays: "2",
  radiusKm: "15",
};

const toForm = (p: SubscriptionPlan): PlanFormValues => ({
  title: p.title,
  description: p.description,
  includes: p.includes,
  price: String(p.price),
  billingInterval: isInterval(p.billing_interval) ? p.billing_interval : "month",
  deliveryInterval: isInterval(p.delivery_interval) ? p.delivery_interval : "week",
  preparationDays: String(p.preparation_days),
  radiusKm: String(p.delivery_radius_km),
});

/**
 * Subscrições do agricultor (/agricultor/subscricoes): os planos (preço,
 * cobrança, entregas, o que inclui, raio) e os clientes que subscreveram.
 */
const MySubscriptions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["offerings", "farmer", "common"]);
  const { user, loading: authLoading } = useAuth();
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [hasFarmPoint, setHasFarmPoint] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SubscriptionPlan | "new" | null>(null);
  const [form, setForm] = useState<PlanFormValues>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<Subscription | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: farmer } = await supabase
      .from("farmer_details")
      .select("id, pickup_lat, pickup_lng")
      .eq("user_id", user.id)
      .maybeSingle();
    setFarmerId(farmer?.id ?? null);
    setHasFarmPoint(farmer?.pickup_lat != null && farmer?.pickup_lng != null);
    if (farmer) {
      const [{ data: planRows }, { data: subRows }] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("farmer_id", farmer.id).order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("farmer_id", farmer.id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);
      setPlans(planRows ?? []);
      setSubscribers(subRows ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    load();
  }, [user, authLoading, navigate, load]);

  const errors: PlanFormErrors = useMemo(() => validatePlan(form), [form]);
  const shownErrors = submitted ? errors : {};
  const set = <K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) => setForm((f) => ({ ...f, [key]: value }));

  const openEditor = (plan: SubscriptionPlan | "new") => {
    setEditing(plan);
    setForm(plan === "new" ? EMPTY_FORM : toForm(plan));
    setSubmitted(false);
  };

  const save = async () => {
    setSubmitted(true);
    if (!farmerId || Object.keys(errors).length > 0) return;
    setSaving(true);
    const row = {
      title: form.title.trim(),
      description: form.description.trim(),
      includes: form.includes.trim(),
      price: Number(form.price.replace(",", ".")),
      billing_interval: form.billingInterval,
      delivery_interval: form.deliveryInterval,
      preparation_days: Number(form.preparationDays),
      delivery_radius_km: Number(form.radiusKm.replace(",", ".")),
    };
    const { error } =
      editing === "new"
        ? await supabase.from("subscription_plans").insert({ ...row, farmer_id: farmerId })
        : await supabase.from("subscription_plans").update(row).eq("id", (editing as SubscriptionPlan).id);
    setSaving(false);
    if (error) {
      toast({ title: t("subscriptions.saveFailed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("subscriptions.saved"), description: t("subscriptions.savedText") });
    setEditing(null);
    load();
  };

  const toggleActive = async (plan: SubscriptionPlan, active: boolean) => {
    const { error } = await supabase.from("subscription_plans").update({ active }).eq("id", plan.id);
    if (error) {
      toast({ title: t("farmer:lists.updateFailed"), description: error.message, variant: "destructive" });
      return;
    }
    setPlans((list) => list.map((p) => (p.id === plan.id ? { ...p, active } : p)));
  };

  const cancelSubscriber = async () => {
    if (!cancelling) return;
    const { error } = await supabase.rpc("cancel_subscription", { p_subscription_id: cancelling.id });
    setCancelling(null);
    if (error) {
      toast({ title: t("subscriptions.cancelFailed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("subscriptions.cancelledByFarmer"), description: t("subscriptions.cancelledByFarmerText") });
    load();
  };

  if (loading) {
    return (
      <div className="container flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">{t("subscriptions.completeProfile")}</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding/agricultor")}>{t("farmer:editors.completeProfile")}</Button>
      </div>
    );
  }

  const subscribersOf = (planId: string) => subscribers.filter((s) => s.plan_id === planId).length;
  const billing: SubscriptionInterval = form.billingInterval;
  const delivery: SubscriptionInterval = form.deliveryInterval;
  const price = Number(form.price.replace(",", "."));

  return (
    <div className="container max-w-4xl py-8">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("common:actions.back")}
      </button>
      <PageHeader
        className="mb-0"
        eyebrow={t("farmer:area")}
        title={t("common:menu.farmer.mySubscriptions")}
        description={t("subscriptions.farmerText", {
          compensation: LEGAL.subscriptionCompensationPercent,
          fine: LEGAL.subscriptionFinePercent,
        })}
        actions={
          <Button className="gap-2" onClick={() => openEditor("new")} disabled={!hasFarmPoint}>
            <Plus className="h-4 w-4" /> {t("subscriptions.newPlan")}
          </Button>
        }
      />

      {!hasFarmPoint && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
          {t("subscriptions.noFarmPoint")}
        </p>
      )}

      {plans.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <Repeat className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("subscriptions.noPlans")}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {plans.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{p.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatEuro(Number(p.price))} {billingLabel(p.billing_interval)}</span>
                  <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {deliveryLabel(p.delivery_interval)}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {t("subscriptions.radius", { km: formatNumber(Number(p.delivery_radius_km)) })}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t("subscriptions.subscribers", { count: subscribersOf(p.id) })}</span>
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={p.active} onCheckedChange={(v) => toggleActive(p, v)} aria-label={t("subscriptions.planActive")} />
                {p.active ? t("farmer:lists.activeM") : t("farmer:lists.inactiveM")}
              </label>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEditor(p)}>
                <Pencil className="h-4 w-4" /> {t("common:actions.edit")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Clientes com subscrição ativa */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-foreground">{t("subscriptions.activeTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subscriptions.activeText")}</p>
        {subscribers.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("subscriptions.noSubscribers")}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {subscribers.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.delivery_address}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("subscriptions.nextBilling", { date: formatDate(s.next_billing_at) })}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => setCancelling(s)}>
                  <XCircle className="h-4 w-4" /> {t("subscriptions.cancel")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Editor do plano */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("subscriptions.newPlan") : t("subscriptions.editPlan")}</DialogTitle>
            <DialogDescription>{t("subscriptions.editorText")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field id="plan-title" label={t("subscriptions.fields.title")} error={shownErrors.title}>
              <Input id="plan-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t("subscriptions.fields.titlePlaceholder")} />
            </Field>
            <Field id="plan-description" label={t("subscriptions.fields.description")} error={shownErrors.description}>
              <Textarea id="plan-description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field id="plan-includes" label={t("subscriptions.fields.includes")} hint={t("subscriptions.fields.includesHint")} error={shownErrors.includes}>
              <Textarea id="plan-includes" rows={4} value={form.includes} onChange={(e) => set("includes", e.target.value)} placeholder={t("subscriptions.fields.includesPlaceholder")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="plan-price" label={t("subscriptions.fields.price")} hint={t("subscriptions.fields.priceHint")} error={shownErrors.price}>
                <Input id="plan-price" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="25,00" />
              </Field>
              <Field id="plan-billing" label={t("subscriptions.fields.billing")}>
                <Select value={form.billingInterval} onValueChange={(v) => set("billingInterval", v as SubscriptionInterval)}>
                  <SelectTrigger id="plan-billing"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_INTERVALS.map((i) => (
                      <SelectItem key={i} value={i}>{t(`subscriptions.intervals.${i}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="plan-delivery" label={t("subscriptions.fields.delivery")} error={shownErrors.deliveryInterval}>
                <Select value={form.deliveryInterval} onValueChange={(v) => set("deliveryInterval", v as SubscriptionInterval)}>
                  <SelectTrigger id="plan-delivery"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_INTERVALS.map((i) => (
                      <SelectItem key={i} value={i}>{deliveryLabel(i)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="plan-prep" label={t("subscriptions.fields.preparation")} hint={t("subscriptions.fields.preparationHint")} error={shownErrors.preparationDays}>
                <Input id="plan-prep" inputMode="numeric" value={form.preparationDays} onChange={(e) => set("preparationDays", e.target.value)} />
              </Field>
              <Field id="plan-radius" label={t("subscriptions.fields.radius")} hint={t("subscriptions.fields.radiusHint")} error={shownErrors.radiusKm}>
                <Input id="plan-radius" inputMode="decimal" value={form.radiusKm} onChange={(e) => set("radiusKm", e.target.value)} />
              </Field>
            </div>

            {!errors.price && !errors.deliveryInterval && (
              <p className="rounded-lg bg-primary/5 p-3 text-xs text-foreground">
                {t("subscriptions.summary", {
                  count: deliveriesPerPeriod(billing, delivery),
                  price: formatEuro(price),
                  each: formatEuro(pricePerDelivery(price, billing, delivery)),
                  billing: billingLabel(billing),
                })}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t("common:actions.cancel")}</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common:actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelling !== null} onOpenChange={(o) => !o && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriptions.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("subscriptions.cancelConfirmFarmer")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.back")}</AlertDialogCancel>
            <AlertDialogAction onClick={cancelSubscriber}>{t("subscriptions.cancel")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/** Rótulo, campo, dica e erro. */
const Field = ({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5" data-invalid={error ? "true" : undefined}>
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs font-medium text-destructive">{error}</p>}
  </div>
);

export default MySubscriptions;
