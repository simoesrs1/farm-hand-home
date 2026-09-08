/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarArrowDown,
  Clock,
  Loader2,
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
          "id, company_name, pickup_hours, pickup_hours_note, delivery_radius_km, delivery_hours, delivery_note",
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
