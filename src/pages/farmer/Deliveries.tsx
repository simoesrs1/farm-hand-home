/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DAY_LABELS, parsePickupHours, weeklyHours, type PickupWindow } from "@/lib/pickup-hours";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit: string | null;
}

interface Order {
  id: string;
  total: number;
  status: "pending_payment" | "awaiting_pickup" | "delivered" | "expired" | "refunded";
  scheduled_pickup_at: string | null;
  pickup_deadline: string;
  accepted_at: string | null;
  delivered_at: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const statusMeta = {
  pending_payment: { label: "Pendente", tone: "bg-muted text-muted-foreground", Icon: Clock },
  awaiting_pickup: { label: "A aguardar entrega", tone: "bg-primary/15 text-primary", Icon: Truck },
  delivered: {
    label: "Entregue",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  expired: { label: "Expirada", tone: "bg-destructive/15 text-destructive", Icon: XCircle },
  refunded: { label: "Devolvida", tone: "bg-destructive/15 text-destructive", Icon: XCircle },
} as const;

const FarmerDeliveries = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [farmerId, setFarmerId] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [radiusKm, setRadiusKm] = useState("");
  const [windows, setWindows] = useState<PickupWindow[]>([]);
  const [note, setNote] = useState("");

  const [deliveryProducts, setDeliveryProducts] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("farmer_details")
        .select("id, delivery_radius_km, delivery_hours, delivery_note")
        .eq("user_id", user.id)
        .maybeSingle();
      const row = data as any;
      if (cancelled) return;
      setFarmerId(row?.id ?? null);
      const radius = row?.delivery_radius_km;
      setEnabled(radius != null && Number(radius) > 0);
      setRadiusKm(radius != null ? String(radius) : "");
      setWindows(parsePickupHours(row?.delivery_hours));
      setNote(row?.delivery_note ?? "");

      if (row?.id) {
        const [{ data: prods }, { data: ords }] = await Promise.all([
          supabase.from("products").select("name").eq("farmer_id", row.id).eq("local_delivery", true),
          supabase
            .from("orders")
            .select(
              "id,total,status,scheduled_pickup_at,pickup_deadline,accepted_at,delivered_at,created_at,order_items(id,product_name,product_image,quantity,unit)",
            )
            .eq("farmer_id", row.id)
            .order("created_at", { ascending: false }),
        ]);
        if (cancelled) return;
        setDeliveryProducts(((prods as any[]) ?? []).map((p) => p.name));
        setOrders((ords as Order[]) ?? []);
      }
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("farmer-deliveries:" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const deliveryOrders = useMemo(() => {
    if (deliveryProducts.length === 0) return [];
    const names = new Set(deliveryProducts);
    return orders.filter((o) => (o.order_items ?? []).some((it) => names.has(it.product_name)));
  }, [orders, deliveryProducts]);

  const addWindow = (day: number) => setWindows((w) => [...w, { day, start: "09:00", end: "18:00" }]);
  const updateWindow = (index: number, patch: Partial<PickupWindow>) =>
    setWindows((ws) => ws.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  const removeWindow = (index: number) => setWindows((ws) => ws.filter((_, i) => i !== index));

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
    const radius = parseFloat(radiusKm.replace(",", "."));
    if (enabled && (!Number.isFinite(radius) || radius <= 0)) {
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
        delivery_radius_km: enabled ? radius : null,
        delivery_hours: enabled ? windows : [],
        delivery_note: enabled ? note.trim() || null : null,
      } as any)
      .eq("id", farmerId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro a guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Entregas atualizadas",
      description: "Os clientes já veem até onde entrega e em que horas.",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = deliveryOrders.filter((o) => o.status === "awaiting_pickup").length;
  const doneCount = deliveryOrders.filter((o) => o.status === "delivered").length;

  return (
    <main className="container max-w-4xl py-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Início
      </Link>

      <div className="flex items-center gap-3">
        <Truck className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold text-foreground">Entregas ao domicílio</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Defina até onde entrega, em que horas, e acompanhe o estado de cada entrega.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Raio de entrega</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {enabled && radiusKm ? `${radiusKm} km` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Horas por semana</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{weeklyHours(windows)}h</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Entregas ativas</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">{activeCount}</p>
        </div>
      </div>

      <Card className="mt-6 p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Faço entregas ao domicílio</p>
              <p className="text-sm text-muted-foreground">
                Entregas feitas por si, em mão — não é envio por transportadora.
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Faço entregas ao domicílio" />
        </div>

        {enabled && (
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

      {enabled && (
        <>
          <h2 className="mt-8 font-display text-xl font-semibold">Horários de entrega</h2>
          <div className="mt-3 space-y-4">
            {DAY_LABELS.map((label, day) => {
              const dayWindows = windows
                .map((w, index) => ({ w, index }))
                .filter(({ w }) => w.day === day);
              return (
                <Card key={day} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">{label}</h3>
                      {dayWindows.length === 0 && (
                        <span className="text-xs text-muted-foreground">Sem entregas</span>
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
          </div>

          <Card className="mt-4 p-4 space-y-2">
            <Label htmlFor="delivery-note">Nota sobre as entregas (opcional)</Label>
            <Textarea
              id="delivery-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Entregas agrupadas por zona. Combine a morada exata pelo chat."
            />
          </Card>
        </>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar entregas
        </Button>
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold">
        Encomendas com entrega ao domicílio
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {doneCount} entregue(s) · {activeCount} por entregar
      </p>

      {loading ? (
        <Skeleton className="mt-4 h-32 w-full" />
      ) : deliveryOrders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Ainda não há encomendas com produtos marcados para entrega ao domicílio.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {deliveryOrders.map((o) => {
            const m = statusMeta[o.status];
            const Icon = m.Icon;
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Encomenda #{o.id.slice(0, 8).toUpperCase()} ·{" "}
                      {new Date(o.created_at).toLocaleDateString("pt-PT")}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-foreground">
                      {o.total.toFixed(2)}€
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${m.tone}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {m.label}
                    </span>
                    <Link to={`/agricultor/encomendas?id=${o.id}`}>
                      <Button size="sm" variant="outline">
                        Ver detalhes
                      </Button>
                    </Link>
                  </div>
                </div>

                {o.scheduled_pickup_at && (
                  <p className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-sm font-medium text-foreground">
                    <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                    Combinado para{" "}
                    {new Date(o.scheduled_pickup_at).toLocaleString("pt-PT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                <ul className="mt-3 space-y-2 border-t border-border pt-3">
                  {(o.order_items ?? []).map((it) => (
                    <li key={it.id} className="flex items-center gap-3 text-sm">
                      {it.product_image && (
                        <img
                          src={it.product_image}
                          alt={it.product_name}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      )}
                      <span className="flex-1 text-foreground">{it.product_name}</span>
                      <span className="text-muted-foreground">
                        {it.quantity} {it.unit ?? ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
};

export default FarmerDeliveries;
