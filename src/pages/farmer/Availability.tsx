/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarArrowDown,
  Clock,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  Truck,
  TrendingUp,
} from "lucide-react";
import { downloadPickupIcs } from "@/lib/pickup-ical";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  dayLabels,
  parsePickupHours,
  pickupStatus,
  weeklyHours,
  type PickupWindow,
} from "@/lib/pickup-hours";
import { formatReturnDate, isPaused, todayLisbon } from "@/lib/farmer-activity";
import { Trans, useTranslation } from "react-i18next";

const MAX_PAUSE_DAYS = 183;
const PAUSE_NOTE_MAX = 280;

/** Soma dias a uma data AAAA-MM-DD (ao meio-dia, para evitar saltos de fuso). */
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

interface PauseCardProps {
  farmerId: string;
  pausedUntil: string | null;
  pauseNote: string;
  onChange: (pausedUntil: string | null, note: string) => void;
}

/**
 * Pausa voluntária (férias, entressafra): oculta os produtos, bloqueia
 * encomendas e congela a pontuação de atividade até à data de regresso.
 */
const PauseCard = ({ farmerId, pausedUntil, pauseNote, onChange }: PauseCardProps) => {
  const { t } = useTranslation(["farmer", "common"]);
  const today = todayLisbon();
  const [returnDate, setReturnDate] = useState(addDays(today, 14));
  const [note, setNote] = useState(pauseNote);
  const [busy, setBusy] = useState(false);
  const paused = isPaused(pausedUntil);

  const save = async (until: string | null, noteValue: string) => {
    setBusy(true);
    const { error } = await supabase
      .from("farmer_details")
      .update({ paused_until: until, pause_note: until ? noteValue.trim() || null : null })
      .eq("id", farmerId);
    setBusy(false);
    if (error) {
      toast({ title: t("availability.saveFailed"), description: error.message, variant: "destructive" });
      return;
    }
    onChange(until, until ? noteValue.trim() : "");
    toast(
      until
        ? {
            title: t("availability.pauseOn"),
            description: t("availability.pauseOnText", { date: formatReturnDate(until) }),
          }
        : { title: t("availability.pauseOff"), description: t("availability.pauseOffText") },
    );
  };

  const handleActivate = () => {
    if (!returnDate || returnDate <= today || returnDate > addDays(today, MAX_PAUSE_DAYS)) {
      toast({
        title: t("availability.badReturn"),
        description: t("availability.badReturnText"),
        variant: "destructive",
      });
      return;
    }
    save(returnDate, note);
  };

  if (paused && pausedUntil) {
    return (
      <Card className="mt-5 border-warning/40 bg-warning/10 p-4">
        <div className="flex items-start gap-3">
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">
              {t("availability.pausedUntil", { date: formatReturnDate(pausedUntil) })}
            </p>
            <p className="mt-1 text-muted-foreground">
              {t("availability.pausedText")}
            </p>
            {pauseNote && <p className="mt-2 italic text-muted-foreground">"{pauseNote}"</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" className="gap-2" disabled={busy} onClick={() => save(null, "")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {t("availability.endPause")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-5 space-y-4 p-4">
      <div className="flex items-start gap-3">
        <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-medium text-foreground">{t("availability.pauseQuestion")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("availability.pauseExplain")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="space-y-2">
          <Label htmlFor="pause-until">{t("availability.returnDate")}</Label>
          <Input
            id="pause-until"
            type="date"
            min={addDays(today, 1)}
            max={addDays(today, MAX_PAUSE_DAYS)}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pause-note">{t("availability.pauseNote")}</Label>
          <Textarea
            id="pause-note"
            rows={2}
            maxLength={PAUSE_NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("availability.pauseNotePlaceholder")}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2" disabled={busy} onClick={handleActivate}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
          {t("availability.activatePause")}
        </Button>
      </div>
    </Card>
  );
};

interface ScheduleEditorProps {
  windows: PickupWindow[];
  onChange: (windows: PickupWindow[]) => void;
  idPrefix: string;
}

/** Weekly time-window editor, shared by open-door hours and delivery hours. */
const ScheduleEditor = ({ windows, onChange, idPrefix }: ScheduleEditorProps) => {
  const { t } = useTranslation(["farmer", "common"]);
  const addWindow = (day: number) => onChange([...windows, { day, start: "09:00", end: "18:00" }]);
  const updateWindow = (index: number, patch: Partial<PickupWindow>) =>
    onChange(windows.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  const removeWindow = (index: number) => onChange(windows.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      {dayLabels().map((label, day) => {
        const dayWindows = windows
          .map((w, index) => ({ w, index }))
          .filter(({ w }) => w.day === day);
        return (
          <Card key={`${idPrefix}-${day}`} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-medium">{label}</h3>
                {dayWindows.length === 0 && (
                  <span className="text-xs text-muted-foreground">{t("availability.closed")}</span>
                )}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => addWindow(day)}>
                <Plus className="h-4 w-4" /> {t("availability.addWindow")}
              </Button>
            </div>

            {dayWindows.length > 0 && (
              <div className="mt-3 space-y-2">
                {dayWindows.map(({ w, index }) => (
                  <div key={`${idPrefix}-${index}`} className="flex flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      value={w.start}
                      onChange={(e) => updateWindow(index, { start: e.target.value })}
                      className="w-32"
                      aria-label={t("availability.startAria", { day: label })}
                    />
                    <span className="text-muted-foreground">{t("availability.to")}</span>
                    <Input
                      type="time"
                      value={w.end}
                      onChange={(e) => updateWindow(index, { end: e.target.value })}
                      className="w-32"
                      aria-label={t("availability.endAria", { day: label })}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeWindow(index)}
                      aria-label={t("availability.removeWindow")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

const FarmerAvailability = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useTranslation(["farmer", "common"]);

  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [farmName, setFarmName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windows, setWindows] = useState<PickupWindow[]>([]);
  const [note, setNote] = useState("");

  // Entrega ao domicílio feita pelo próprio agricultor
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [radiusKm, setRadiusKm] = useState("");
  const [deliveryWindows, setDeliveryWindows] = useState<PickupWindow[]>([]);
  const [deliveryNote, setDeliveryNote] = useState("");

  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [pauseNote, setPauseNote] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile && profile.profile_type !== "vendedor") navigate("/");
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("farmer_details")
        .select(
          "id, company_name, pickup_hours, pickup_hours_note, delivery_radius_km, delivery_hours, delivery_note, paused_until, pause_note",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      const row = data as any;
      setFarmerId(row?.id ?? null);
      setFarmName(row?.company_name ?? "");
      setWindows(parsePickupHours(row?.pickup_hours));
      setNote(row?.pickup_hours_note ?? "");
      const radius = row?.delivery_radius_km;
      setDeliveryEnabled(radius != null && Number(radius) > 0);
      setRadiusKm(radius != null ? String(radius) : "");
      setDeliveryWindows(parsePickupHours(row?.delivery_hours));
      setDeliveryNote(row?.delivery_note ?? "");
      setPausedUntil(row?.paused_until ?? null);
      setPauseNote(row?.pause_note ?? "");
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!farmerId) return;
    const invalid = [...windows, ...deliveryWindows].find(
      (w) => !w.start || !w.end || w.start >= w.end,
    );
    if (invalid) {
      toast({
        title: t("availability.badWindow"),
        description: t("availability.badWindowText"),
        variant: "destructive",
      });
      return;
    }
    const radius = parseFloat(radiusKm.replace(",", "."));
    if (deliveryEnabled && (!Number.isFinite(radius) || radius <= 0)) {
      toast({
        title: t("availability.noRadius"),
        description: t("availability.noRadiusText"),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("farmer_details")
      .update({
        pickup_hours: windows,
        pickup_hours_note: note.trim() || null,
        delivery_radius_km: deliveryEnabled ? radius : null,
        delivery_hours: deliveryEnabled ? deliveryWindows : [],
        delivery_note: deliveryEnabled ? deliveryNote.trim() || null : null,
      } as any)
      .eq("id", farmerId);
    setSaving(false);
    if (error) {
      toast({ title: t("availability.saveError"), description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: t("availability.saved"),
      description: t("availability.savedText"),
    });
  };

  if (authLoading || loading) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = weeklyHours(windows);
  const status = pickupStatus(windows);

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
        title={t("availability.title")}
        description={t("availability.description")}
      />

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {t("availability.moreTime")}
          </p>
          <p className="mt-1 text-muted-foreground">
            <Trans t={t} i18nKey="availability.weeklyHours" values={{ hours: total }} components={{ b: <strong /> }} />
            {status && ` ${status.label}.`}
          </p>
        </div>
      </div>

      {farmerId && (
        <PauseCard
          farmerId={farmerId}
          pausedUntil={pausedUntil}
          pauseNote={pauseNote}
          onChange={(until, n) => {
            setPausedUntil(until);
            setPauseNote(n);
          }}
        />
      )}

      <h2 className="mt-8 font-display text-xl font-semibold">{t("availability.openDoor")}</h2>
      <div className="mt-3">
        <ScheduleEditor windows={windows} onChange={setWindows} idPrefix="pickup" />
      </div>

      <Card className="mt-4 p-4 space-y-2">
        <Label htmlFor="note">{t("availability.note")}</Label>
        <Textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("availability.notePlaceholder")}
        />
      </Card>

      <h2 className="mt-10 font-display text-xl font-semibold">{t("availability.homeDelivery")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("availability.homeDeliveryText")}
      </p>

      <Card className="mt-3 p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{t("availability.iDeliver")}</p>
              <p className="text-sm text-muted-foreground">
                {t("availability.iDeliverHint")}
              </p>
            </div>
          </div>
          <Switch
            checked={deliveryEnabled}
            onCheckedChange={setDeliveryEnabled}
            aria-label={t("availability.iDeliver")}
          />
        </div>

        {deliveryEnabled && (
          <div className="space-y-2">
            <Label htmlFor="radius">{t("availability.radius")}</Label>
            <Input
              id="radius"
              type="number"
              min={1}
              step="0.5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
              className="w-32"
              placeholder={t("availability.radiusPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("availability.radiusHint")}
            </p>
          </div>
        )}
      </Card>

      {deliveryEnabled && (
        <>
          <h3 className="mt-6 text-sm font-medium text-muted-foreground">
            {t("availability.deliveryHours")}
          </h3>
          <div className="mt-3">
            <ScheduleEditor
              windows={deliveryWindows}
              onChange={setDeliveryWindows}
              idPrefix="delivery"
            />
          </div>

          <Card className="mt-4 p-4 space-y-2">
            <Label htmlFor="delivery-note">{t("availability.deliveryNote")}</Label>
            <Textarea
              id="delivery-note"
              rows={3}
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder={t("availability.deliveryNotePlaceholder")}
            />
          </Card>
        </>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={windows.length === 0}
          onClick={() => downloadPickupIcs(windows, farmName || t("availability.myFarm"), note)}
        >
          <CalendarArrowDown className="h-4 w-4" />
          {t("availability.exportIcal")}
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("availability.save")}
        </Button>
      </div>
    </div>
  );
};

export default FarmerAvailability;
