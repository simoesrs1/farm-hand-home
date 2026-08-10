/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarArrowDown, Clock, Loader2, Plus, Save, Trash2, TrendingUp } from "lucide-react";
import { downloadPickupIcs } from "@/lib/pickup-ical";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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

const FarmerAvailability = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windows, setWindows] = useState<PickupWindow[]>([]);
  const [note, setNote] = useState("");

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
        .select("id, pickup_hours, pickup_hours_note")
        .eq("user_id", user.id)
        .maybeSingle();
      const row = data as any;
      setFarmerId(row?.id ?? null);
      setWindows(parsePickupHours(row?.pickup_hours));
      setNote(row?.pickup_hours_note ?? "");
      setLoading(false);
    })();
  }, [user]);

  const addWindow = (day: number) =>
    setWindows((prev) => [...prev, { day, start: "09:00", end: "18:00" }]);

  const updateWindow = (index: number, patch: Partial<PickupWindow>) =>
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  const removeWindow = (index: number) =>
    setWindows((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!farmerId) return;
    const invalid = windows.find((w) => !w.start || !w.end || w.start >= w.end);
    if (invalid) {
      toast({
        title: "Horário inválido",
        description: "A hora de fim tem de ser posterior à hora de início.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("farmer_details")
      .update({ pickup_hours: windows, pickup_hours_note: note.trim() || null } as any)
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

      <div className="mt-8 space-y-4">
        {DAY_LABELS.map((label, day) => {
          const dayWindows = windows
            .map((w, index) => ({ w, index }))
            .filter(({ w }) => w.day === day);
          return (
            <Card key={day} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h2 className="font-medium">{label}</h2>
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
                    <div key={index} className="flex flex-wrap items-center gap-2">
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

        <Card className="p-4 space-y-2">
          <Label htmlFor="note">Nota para os clientes (opcional)</Label>
          <Textarea
            id="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Toque à campainha do portão verde. Fora deste horário, combine pelo chat."
          />
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
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
    </div>
  );
};

export default FarmerAvailability;
