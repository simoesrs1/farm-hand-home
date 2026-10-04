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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DAY_LABELS,
  parsePickupHours,
  pickupStatus,
  weeklyHours,
  type PickupWindow,
} from "@/lib/pickup-hours";
import { formatReturnDate, isPaused, todayLisbon } from "@/lib/farmer-activity";

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
      toast({ title: "Não foi possível guardar", description: error.message, variant: "destructive" });
      return;
    }
    onChange(until, until ? noteValue.trim() : "");
    toast(
      until
        ? {
            title: "Pausa ativada",
            description: `Os seus produtos voltam a aparecer a ${formatReturnDate(until)}.`,
          }
        : { title: "Pausa terminada", description: "Os seus produtos já estão de volta ao catálogo." },
    );
  };

  const handleActivate = () => {
    if (!returnDate || returnDate <= today || returnDate > addDays(today, MAX_PAUSE_DAYS)) {
      toast({
        title: "Data de regresso inválida",
        description: "Escolha uma data a partir de amanhã e até 6 meses.",
        variant: "destructive",
      });
      return;
    }
    save(returnDate, note);
  };

  if (paused && pausedUntil) {
    return (
      <Card className="mt-5 border-accent/40 bg-accent/10 p-4">
        <div className="flex items-start gap-3">
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">
              Está em pausa até {formatReturnDate(pausedUntil)}.
            </p>
            <p className="mt-1 text-muted-foreground">
              Os seus produtos não aparecem no catálogo e não recebe encomendas. A sua pontuação de
              atividade está congelada, por isso não perde posição.
            </p>
            {pauseNote && <p className="mt-2 italic text-muted-foreground">"{pauseNote}"</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" className="gap-2" disabled={busy} onClick={() => save(null, "")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Terminar pausa agora
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
          <p className="font-medium text-foreground">Vai de férias ou está em entressafra?</p>
          <p className="mt-1 text-muted-foreground">
            Ative a pausa: os seus produtos ficam ocultos, não recebe encomendas e a sua pontuação de
            atividade fica congelada até regressar.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="space-y-2">
          <Label htmlFor="pause-until">Data de regresso</Label>
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
          <Label htmlFor="pause-note">Mensagem para os clientes (opcional)</Label>
          <Textarea
            id="pause-note"
            rows={2}
            maxLength={PAUSE_NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Estamos na entressafra. Voltamos com as primeiras laranjas!"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2" disabled={busy} onClick={handleActivate}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
          Ativar pausa
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
  const addWindow = (day: number) => onChange([...windows, { day, start: "09:00", end: "18:00" }]);
  const updateWindow = (index: number, patch: Partial<PickupWindow>) =>
    onChange(windows.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  const removeWindow = (index: number) => onChange(windows.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      {DAY_LABELS.map((label, day) => {
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
                  <span className="text-xs text-muted-foreground">Fechado</span>
                )}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => addWindow(day)}>
                <Plus className="h-4 w-4" /> Horário
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
                      aria-label={`Início ${label}`}
                    />
                    <span className="text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={w.end}
                      onChange={(e) => updateWindow(index, { end: e.target.value })}
                      className="w-32"
                      aria-label={`Fim ${label}`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeWindow(index)}
                      aria-label="Remover horário"
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
        title: "Horário inválido",
        description: "A hora de fim tem de ser posterior à hora de início.",
        variant: "destructive",
      });
      return;
    }
    const radius = parseFloat(radiusKm.replace(",", "."));
    if (deliveryEnabled && (!Number.isFinite(radius) || radius <= 0)) {
      toast({
        title: "Indique a distância de entrega",
        description: "Diga até quantos quilómetros faz entregas ao domicílio.",
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
      toast({ title: "Erro a guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Disponibilidade atualizada",
      description: "Os clientes já veem quando pode entregar as encomendas.",
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
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="font-display text-3xl font-bold text-foreground">Disponibilidade</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Indique os dias e horas em que tem a porta aberta para entregar as encomendas.
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            Quanto mais tempo disponível, mais hipóteses tem de vender.
          </p>
          <p className="mt-1 text-muted-foreground">
            Neste momento tem <strong>{total}h</strong> de porta aberta por semana.
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

      <h2 className="mt-8 font-display text-xl font-semibold">Porta aberta (levantamento)</h2>
      <div className="mt-3">
        <ScheduleEditor windows={windows} onChange={setWindows} idPrefix="pickup" />
      </div>

      <Card className="mt-4 p-4 space-y-2">
        <Label htmlFor="note">Nota para os clientes (opcional)</Label>
        <Textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: Toque à campainha do portão verde. Fora deste horário, combine pelo chat."
        />
      </Card>

      <h2 className="mt-10 font-display text-xl font-semibold">Entrega ao domicílio</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Entregas feitas por si, em mão, na morada do cliente — não é envio por transportadora.
      </p>

      <Card className="mt-3 p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Faço entregas ao domicílio</p>
              <p className="text-sm text-muted-foreground">
                Ative para indicar até onde entrega e em que horas.
              </p>
            </div>
          </div>
          <Switch
            checked={deliveryEnabled}
            onCheckedChange={setDeliveryEnabled}
            aria-label="Faço entregas ao domicílio"
          />
        </div>

        {deliveryEnabled && (
          <div className="space-y-2">
            <Label htmlFor="radius">Distância máxima de entrega (km)</Label>
            <Input
              id="radius"
              type="number"
              min={1}
              step="0.5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
              className="w-32"
              placeholder="Ex: 15"
            />
            <p className="text-xs text-muted-foreground">
              Só entrega a clientes dentro desta distância da sua exploração.
            </p>
          </div>
        )}
      </Card>

      {deliveryEnabled && (
        <>
          <h3 className="mt-6 text-sm font-medium text-muted-foreground">
            Horários de entrega de produtos
          </h3>
          <div className="mt-3">
            <ScheduleEditor
              windows={deliveryWindows}
              onChange={setDeliveryWindows}
              idPrefix="delivery"
            />
          </div>

          <Card className="mt-4 p-4 space-y-2">
            <Label htmlFor="delivery-note">Nota sobre as entregas (opcional)</Label>
            <Textarea
              id="delivery-note"
              rows={3}
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="Ex: Entregas agrupadas por zona. Combine a morada exata pelo chat."
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
          onClick={() => downloadPickupIcs(windows, farmName || "A minha quinta", note)}
        >
          <CalendarArrowDown className="h-4 w-4" />
          Exportar calendário (iCal)
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar disponibilidade
        </Button>
      </div>
    </div>
  );
};

export default FarmerAvailability;
