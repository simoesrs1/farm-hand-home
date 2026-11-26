import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, ArrowLeft, ScanLine, ThumbsUp, Undo2, CalendarClock, Truck, MapPin, AlertTriangle, Tent, Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SectionHeading from "@/components/SectionHeading";
import OrderChat from "@/components/OrderChat";
import ValidateDeliveryDialog from "@/components/ValidateDeliveryDialog";
import LotAllocationDialog from "@/components/LotAllocationDialog";
import { ordersWithPendingLots } from "@/lib/lot-allocations";
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
import DeliveryRouteMapDialog, { DeliveryRouteControls, RouteDaySummary } from "@/components/DeliveryRouteMapDialog";
import { useDeliveryRoute, type RouteStop } from "@/hooks/useDeliveryRoute";
import { amountLabel, formatDate, formatDateTime, formatEuro, formatTime } from "@/lib/format";
import { scopedStorage, STORAGE_KEYS } from "@/lib/consent";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import TranslatedText from "@/components/TranslatedText";

/** Escolhas do agricultor na rota das entregas, guardadas no browser. */
interface RoutePrefs {
  optimized: boolean;
  returnToOrigin: boolean;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  subtotal: number;
}

interface Order {
  id: string;
  total: number;
  commission_amount: number;
  farmer_amount: number;
  status: "pending_payment" | "awaiting_pickup" | "delivered" | "expired" | "refunded";
  pickup_deadline: string;
  pickup_code: string;
  scheduled_pickup_at: string | null;
  delivered_at: string | null;
  expired_at: string | null;
  accepted_at: string | null;
  delivery_fee: number;
  created_at: string;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_tracking: boolean;
  expected_delivery_at: string | null;
  packed_at: string | null;
  in_transit_at: string | null;
  out_for_delivery_at: string | null;
  kind: string;
  booking_start: string | null;
  booking_end: string | null;
  booking_people: number | null;
  booking_units: number | null;
  cancelled_by: string | null;
  cancellation_fee: number | null;
  farmer_fine: number | null;
  client_compensation: number | null;
  order_items: OrderItem[];
}

const isBooking = (o: Order) => o.kind === "experience" || o.kind === "stay";

// Dia/hora da entrega: a marcada pelo cliente, a prevista (prazo de preparação) ou o prazo limite.
const deliveryWhen = (o: Order) => o.scheduled_pickup_at ?? o.expected_delivery_at ?? o.pickup_deadline;

// Reservas de experiências: rótulos próprios.
const bookingLabel = (o: Order) =>
  o.status === "awaiting_pickup" ? i18n.t("orders:status.booking.awaiting_pickup")
  : o.status === "delivered" ? i18n.t("orders:status.booking.delivered")
  : o.status === "expired" ? i18n.t("orders:status.booking.expired")
  : o.status === "refunded"
    ? i18n.t(o.cancelled_by === "client" ? "farmer:orders.cancelledByClient" : "orders:status.cancelled")
  : null;

const bookingTitle = (o: Order) =>
  o.order_items?.find((it) => it.unit === "pessoa" || it.unit === "grupo" || it.unit === "noite")?.product_name ??
  i18n.t(o.kind === "stay" ? "orders:booking.stay" : "orders:booking.experience");

const formatLisbon = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  formatDateTime(iso, { timeZone: "Europe/Lisbon", ...opts });

type TrackingAction = "packed" | "in_transit" | "out_for_delivery";

// Passos do acompanhamento que o agricultor marca, por ordem. "Entregue" fica
// a cargo da validação do QR code.
// Textos em farmer:orders.tracking.<ação> (botão) e orders:statusPage.tracking.<ação> (passo feito).
const TRACKING_STEPS: { action: TrackingAction; column: "packed_at" | "in_transit_at" | "out_for_delivery_at" }[] = [
  { action: "packed", column: "packed_at" },
  { action: "in_transit", column: "in_transit_at" },
  { action: "out_for_delivery", column: "out_for_delivery_at" },
];

const nextTrackingStep = (o: Order) =>
  o.delivery_tracking && o.status === "awaiting_pickup" && o.accepted_at
    ? TRACKING_STEPS.find((s) => !o[s.column]) ?? null
    : null;

const lastTrackingStep = (o: Order) =>
  [...TRACKING_STEPS].reverse().find((s) => o[s.column]) ?? null;

// Nome de cada estado em farmer:orders.status.<estado>.
const meta = {
  awaiting_pickup: { tone: "bg-info/15 text-info", Icon: Clock },
  delivered: { tone: "bg-success/15 text-success", Icon: CheckCircle2 },
  expired: { tone: "bg-destructive/15 text-destructive", Icon: XCircle },
  refunded: { tone: "bg-destructive/15 text-destructive", Icon: XCircle },
  pending_payment: { tone: "bg-muted text-muted-foreground", Icon: Clock },
} as const;

const FarmerOrders = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(["farmer", "common", "orders", "offerings"]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("id");
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  const [validating, setValidating] = useState<Order | null>(null);
  const [farm, setFarm] = useState<{ lat: number; lng: number; name: string } | null>(null);
  // Queixas em aberto por entrega não recebida: prazo por encomenda.
  const [complaintDeadlines, setComplaintDeadlines] = useState<Record<string, string>>({});
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  // Encomendas com unidades à espera de indicação do lote.
  const [pendingLotOrders, setPendingLotOrders] = useState<Set<string>>(new Set());
  const [lotOrderId, setLotOrderId] = useState<string | null>(null);
  // Percurso das entregas ao domicílio: por hora (por defeito) ou organizado a partir da quinta.
  // As escolhas ficam guardadas no browser; a ordem é recalculada a partir delas.
  const [routePrefs, setRoutePrefs] = useState<RoutePrefs>(
    () => scopedStorage.get<RoutePrefs>(STORAGE_KEYS.deliveryRoute) ?? { optimized: false, returnToOrigin: false },
  );
  const updateRoutePrefs = (patch: Partial<RoutePrefs>) =>
    setRoutePrefs((prev) => {
      const next = { ...prev, ...patch };
      scopedStorage.set(STORAGE_KEYS.deliveryRoute, next);
      return next;
    });
  const routeOptimized = routePrefs.optimized === true;
  const routeReturnToFarm = routePrefs.returnToOrigin === true;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,commission_amount,farmer_amount,status,pickup_deadline,pickup_code,scheduled_pickup_at,delivered_at,expired_at,accepted_at,created_at,delivery_address,delivery_lat,delivery_lng,delivery_tracking,expected_delivery_at,packed_at,in_transit_at,out_for_delivery_at,delivery_fee,kind,booking_start,booking_end,booking_people,booking_units,cancelled_by,cancellation_fee,farmer_fine,client_compensation,order_items(id,product_name,product_image,quantity,unit,unit_price,subtotal)")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      }
      const { data: fd } = await supabase
        .from("farmer_details")
        .select("id, company_name, pickup_lat, pickup_lng")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setFarm(
          fd?.pickup_lat != null && fd?.pickup_lng != null
            ? { lat: Number(fd.pickup_lat), lng: Number(fd.pickup_lng), name: fd.company_name ?? i18n.t("farmer:availability.myFarm") }
            : null,
        );
      }
      const { data: complaints } = await supabase
        .from("delivery_complaints")
        .select("order_id, deadline_at")
        .eq("status", "open");
      if (!cancelled) {
        setComplaintDeadlines(Object.fromEntries((complaints ?? []).map((c) => [c.order_id, c.deadline_at])));
      }
      const pendingLots = await ordersWithPendingLots();
      if (!cancelled) setPendingLotOrders(pendingLots);
    };
    load();
    const ch = supabase
      .channel("farmer-orders:" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const el = refs.current[highlightId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, loading, orders.length]);

  const markDelivered = (orderId: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "delivered", delivered_at: now } : o)),
    );
  };

  const runAction = async (order: Order, action: "accept" | "refund_no_stock" | "cancel_booking" | TrackingAction) => {
    setActing(order.id);
    const { data, error } = await supabase.functions.invoke("order-action", {
      body: { order_id: order.id, action },
    });
    setActing(null);
    const message = (data as { error?: string } | null)?.error;
    if (error || message) {
      toast({
        title: t("orders.actionFailed"),
        description: message ?? t("orders:my.tryAgain"),
        variant: "destructive",
      });
      return;
    }
    const step = TRACKING_STEPS.find((s) => s.action === action);
    if (action === "cancel_booking") {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "refunded", cancelled_by: "farmer", farmer_amount: 0 } : o)),
      );
      toast({ title: t("orders:cancelBooking.done"), description: t("orders.bookingCancelledText") });
    } else if (step) {
      const now = new Date().toISOString();
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, [step.column]: now } : o)));
      toast({ title: t("orders.stepDone", { step: t(`orders:statusPage.tracking.${step.action}`) }), description: t("orders.clientNotified") });
    } else if (action === "accept") {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, accepted_at: new Date().toISOString() } : o)),
      );
      toast({ title: t("orders.accepted"), description: t("orders.clientNotified") });
    } else {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "refunded" } : o)));
      toast({ title: t("orders.refunded"), description: t("orders.refundedText") });
    }
  };

  // Encomenda com entrega ao domicílio: o cliente escolheu receber em casa (tem morada de entrega).
  const isHomeDelivery = useCallback(
    (o: Order) => !isBooking(o) && (o.delivery_address != null || o.delivery_lat != null),
    [],
  );

  // Entregas ao domicílio ativas com ponto marcado pelo cliente, para o mapa do percurso
  const routeStops: RouteStop[] = useMemo(() => {
    return orders
      .filter(
        (o) =>
          o.status === "awaiting_pickup" &&
          o.delivery_lat != null &&
          o.delivery_lng != null,
      )
      .map((o) => ({
        orderId: o.id,
        label: i18n.t("farmer:orders.orderNo", { id: o.id.slice(0, 8).toUpperCase() }),
        address: o.delivery_address,
        lat: Number(o.delivery_lat),
        lng: Number(o.delivery_lng),
        when: new Date(deliveryWhen(o)),
      }));
  }, [orders]);

  // Ordem do percurso por dia: a mesma no diálogo e na lista de planeamento.
  const routeControls = {
    farm,
    optimized: routeOptimized,
    onOptimizedChange: (optimized: boolean) => updateRoutePrefs({ optimized }),
    returnToOrigin: routeReturnToFarm,
    onReturnToOriginChange: (returnToOrigin: boolean) => updateRoutePrefs({ returnToOrigin }),
  };
  const routeDays = useDeliveryRoute(farm, routeStops, { optimized: routeOptimized, returnToOrigin: routeReturnToFarm });

  // Planeamento de entregas ao domicílio: encomendas ativas com produtos de entrega ao domicílio,
  // agrupadas por dia e pela ordem do percurso. As que não têm ponto marcado ficam no fim, por hora.
  const deliveryPlan = useMemo(() => {
    const routeByDay = new Map(routeDays.map((d) => [d.key, d]));
    const whenOf = (o: Order) => new Date(deliveryWhen(o)).getTime();
    const byDay = new Map<string, Order[]>();
    for (const o of orders) {
      if (o.status !== "awaiting_pickup" || !isHomeDelivery(o)) continue;
      const key = new Date(whenOf(o)).toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(o);
    }
    return [...byDay.entries()]
      .map(([key, list]) => {
        const route = routeByDay.get(key) ?? null;
        const stopNumber = new Map(route?.stops.map((s, i) => [s.orderId, i + 1]) ?? []);
        return {
          key,
          date: new Date(key),
          route,
          stopNumber,
          orders: list.sort(
            (a, b) =>
              (stopNumber.get(a.id) ?? Infinity) - (stopNumber.get(b.id) ?? Infinity) || whenOf(a) - whenOf(b),
          ),
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [orders, isHomeDelivery, routeDays]);

  if (!user || profile?.profile_type !== "vendedor") {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">{t("farmersOnly")}</p>
      </main>
    );
  }

  const earnedDelivered = orders
    .filter((o) => o.status === "delivered")
    .reduce((acc, o) => acc + o.farmer_amount, 0);
  const earnedExpired = orders
    .filter((o) => o.status === "expired")
    .reduce((acc, o) => acc + Math.round(o.total * 0.1 * 100) / 100, 0);

  const allHomeDeliveryOrders = orders.filter(isHomeDelivery);
  const homeDeliveryOrders = allHomeDeliveryOrders.filter((o) => o.status === "awaiting_pickup");
  const homeDeliveredCount = allHomeDeliveryOrders.filter((o) => o.status === "delivered").length;

  return (
    <main className="container max-w-5xl py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("orders:my.home")}
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <SectionHeading as="h1" eyebrow={t("area")} title={t("orders.title")} />
        <div className="flex flex-wrap items-center gap-2">
          <DeliveryRouteMapDialog days={routeDays} {...routeControls}>
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="font-display text-lg font-semibold text-foreground">
                {t("orders.homeDeliveryOrders")}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("orders.homeDeliveryCounts", { delivered: homeDeliveredCount, pending: homeDeliveryOrders.length })}
              </p>
              {allHomeDeliveryOrders.length === 0 ? (
                <p className="mt-3 rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                  {t("orders.noHomeDelivery")}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {allHomeDeliveryOrders.map((o) => {
                    const m = meta[o.status];
                    const Icon = m.Icon;
                    return (
                      <li key={o.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {t("orders.orderNo", { id: o.id.slice(0, 8).toUpperCase() })} ·{" "}
                            {formatDate(o.created_at)} ·{" "}
                            <span className="font-medium text-foreground">{formatEuro(o.total)}</span>
                          </p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.tone}`}>
                            <Icon className="h-3 w-3" /> {t(`orders.status.${o.status}`)}
                          </span>
                        </div>
                        <p className="mt-2 flex items-center gap-2 text-foreground">
                          <MapPin className="h-4 w-4 shrink-0 text-primary" />
                          {o.delivery_address ?? t("route.addressPending")}
                        </p>
                        {o.scheduled_pickup_at && (
                          <p className="mt-1 flex items-center gap-2 text-foreground">
                            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                            {formatDateTime(o.scheduled_pickup_at, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        <p className="mt-1 text-muted-foreground">
                          {o.order_items.map((it, i) => (
                            <span key={it.id}>
                              {i > 0 && " · "}
                              <TranslatedText type="order_item" id={it.id} field="product_name" text={it.product_name} /> (
                              {amountLabel(it.quantity, it.unit)})
                            </span>
                          ))}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </DeliveryRouteMapDialog>
          <Link to="/agricultor/scan">
            <Button className="gap-2"><ScanLine className="h-4 w-4" /> {t("common:menu.farmer.validateDelivery")}</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("orders.status.awaiting_pickup")}</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {orders.filter((o) => o.status === "awaiting_pickup").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("orders.earnedDelivered")}</p>
          <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-primary">{formatEuro(earnedDelivered)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("orders.earnedExpired")}</p>
          <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-foreground">{formatEuro(earnedExpired)}</p>
        </div>
      </div>

      {!loading && deliveryPlan.length > 0 && (
        <section className="mb-8 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold text-foreground">
              {t("orders.plan")}
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("orders.planText")}
          </p>
          {routeStops.length > 0 && (
            <div className="mt-3">
              <DeliveryRouteControls {...routeControls} />
            </div>
          )}
          <div className="mt-4 space-y-4">
            {deliveryPlan.map((day) => (
              <div key={day.key} className="rounded-xl border border-border bg-background p-4">
                <p className="font-medium capitalize text-foreground">
                  {formatDate(day.date, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                {day.route && (
                  <div className="mt-1">
                    <RouteDaySummary day={day.route} />
                  </div>
                )}
                <ul className="mt-3 space-y-3">
                  {day.orders.map((o) => (
                    <li key={o.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {day.stopNumber.has(o.id) ? (
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold"
                              title={t("orders.stopOrder")}
                            >
                              {day.stopNumber.get(o.id)}
                            </span>
                          ) : null}
                          <CalendarClock className="h-4 w-4 text-primary" />
                          {o.scheduled_pickup_at
                            ? formatTime(o.scheduled_pickup_at)
                            : t("orders.timeTbd")}
                          <span className="text-xs text-muted-foreground">
                            · {t("orders.orderNo", { id: o.id.slice(0, 8).toUpperCase() })}
                          </span>
                        </p>
                        <span className="text-sm font-medium text-foreground">{formatEuro(o.total)}</span>
                      </div>
                      {o.delivery_address && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                          <MapPin className="h-4 w-4 shrink-0 text-primary" />
                          {o.delivery_address}
                        </p>
                      )}
                      {!day.stopNumber.has(o.id) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("orders.noPoint")}
                        </p>
                      )}
                      <ul className="mt-2 space-y-1">
                        {o.order_items.map((it) => (
                          <li key={it.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            {it.product_image && (
                              <img src={it.product_image} alt={it.product_name} className="h-6 w-6 rounded object-cover" />
                            )}
                            <TranslatedText type="order_item" id={it.id} field="product_name" text={it.product_name} className="flex-1" />
                            <span>{amountLabel(it.quantity, it.unit)}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          {t("orders.none")}
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const m = meta[o.status];
            const Icon = m.Icon;
            const farmerGets =
              o.status === "delivered"
                ? o.farmer_amount
                : o.status === "expired" && !isBooking(o)
                ? Math.round(o.total * 0.1 * 100) / 100
                : o.farmer_amount;
            const isHighlighted = highlightId === o.id;
            const homeDelivery = isHomeDelivery(o);
            const nextStep = nextTrackingStep(o);
            const lastStep = lastTrackingStep(o);
            return (
              <li
                key={o.id}
                ref={(el) => { refs.current[o.id] = el; }}
                className={`rounded-2xl border bg-card p-5 transition-all ${isHighlighted ? "border-primary ring-2 ring-primary/30 shadow-lg" : "border-border"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("orders.orderNo", { id: o.id.slice(0, 8).toUpperCase() })} · {formatDateTime(o.created_at)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("orders.total")} <span className="font-medium text-foreground">{formatEuro(o.total)}</span>
                      {" · "}
                      {t("orders.commission")} <span className="font-medium text-foreground">{formatEuro(o.commission_amount)}</span>
                    </p>
                    <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-primary">
                      {t(
                        o.status === "delivered"
                          ? "orders.youGet"
                          : o.status === "expired" || o.status === "refunded"
                            ? "orders.youGot"
                            : "orders.youWillGet",
                        { amount: formatEuro(farmerGets) },
                      )}
                    </p>
                    {o.kind === "subscription" && (
                      <p className="mt-1 text-xs font-medium text-primary">{t("offerings:subscriptions.deliveryBadge")}</p>
                    )}
                    {Number(o.farmer_fine ?? 0) > 0 && (
                      <p className="mt-1 text-xs font-medium text-destructive">
                        {t("offerings:subscriptions.penalty", {
                          compensation: formatEuro(Number(o.client_compensation ?? 0)),
                          fine: formatEuro(Number(o.farmer_fine)),
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${m.tone}`}>
                      <Icon className="h-3.5 w-3.5" /> {(isBooking(o) && bookingLabel(o)) || t(`orders.status.${o.status}`)}
                    </span>
                    {o.status === "awaiting_pickup" && !o.accepted_at && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={acting === o.id}
                          onClick={() => runAction(o, "accept")}
                        >
                          <ThumbsUp className="h-4 w-4" /> {t("orders.accept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          disabled={acting === o.id}
                          onClick={() => runAction(o, "refund_no_stock")}
                        >
                          <Undo2 className="h-4 w-4" /> {t("orders.refundNoStock")}
                        </Button>
                      </>
                    )}
                    {o.delivery_tracking && o.status === "awaiting_pickup" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                        <Truck className="h-3.5 w-3.5" />
                        {t("orders.withTracking")}
                        {lastStep ? ` · ${t(`orders:statusPage.tracking.${lastStep.action}`)}` : ""}
                      </span>
                    )}
                    {nextStep && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={acting === o.id}
                        onClick={() => runAction(o, nextStep.action)}
                      >
                        <Truck className="h-4 w-4" /> {t(`orders.tracking.${nextStep.action}`)}
                      </Button>
                    )}
                    {isBooking(o) && o.status === "awaiting_pickup" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        disabled={acting === o.id}
                        onClick={() => setCancelTarget(o)}
                      >
                        <Undo2 className="h-4 w-4" /> {t("orders:cancelBooking.button")}
                      </Button>
                    )}
                    {o.status === "delivered" && pendingLotOrders.has(o.id) && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLotOrderId(o.id)}>
                        <Boxes className="h-4 w-4" /> {t("orders.indicateLots")}
                      </Button>
                    )}
                    {o.status === "awaiting_pickup" && o.accepted_at && (
                      <Button size="sm" className="gap-1.5" onClick={() => setValidating(o)}>
                        <ScanLine className="h-4 w-4" /> {o.kind === "stay" ? t("orders.validateCheckIn") : isBooking(o) ? t("orders.validateArrival") : t("common:menu.farmer.validateDelivery")}
                      </Button>
                    )}
                  </div>
                </div>

                {isBooking(o) && o.booking_start && (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 p-2.5 text-sm text-foreground">
                    <Tent className="h-4 w-4 shrink-0 text-primary" />
                    {bookingTitle(o)} ·{" "}
                    {o.kind === "stay" && o.booking_end
                      ? t("orders.stayLine", {
                          from: formatLisbon(o.booking_start, { day: "2-digit", month: "2-digit" }),
                          to: formatLisbon(o.booking_end, { day: "2-digit", month: "2-digit" }),
                          guests: t("orders:booking.guests", { count: o.booking_people ?? 0 }),
                          rooms: t("orders:booking.rooms", { count: o.booking_units ?? 0 }),
                        })
                      : `${formatLisbon(o.booking_start, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · ${t("orders:booking.people", { count: o.booking_people ?? 0 })}`}
                  </p>
                )}

                {o.order_items?.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-border pt-4">
                    {o.order_items.map((it) => (
                      <li key={it.id} className="flex items-center gap-3 text-sm">
                        {it.product_image && (
                          <img src={it.product_image} alt={it.product_name} className="h-10 w-10 rounded-md object-cover" />
                        )}
                        <div className="flex-1">
                          <TranslatedText type="order_item" id={it.id} field="product_name" text={it.product_name} as="p" className="font-medium text-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {amountLabel(it.quantity, it.unit)} × {formatEuro(it.unit_price)}
                          </p>
                        </div>
                        <p className="font-medium text-foreground">{formatEuro(it.subtotal)}</p>
                      </li>
                    ))}
                    {o.delivery_fee > 0 && (
                      <li className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("orders:my.homeDeliveryFee")}</span>
                        <span className="font-medium text-foreground">{formatEuro(o.delivery_fee)}</span>
                      </li>
                    )}
                  </ul>
                )}

                {o.status === "awaiting_pickup" && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm text-muted-foreground">
                    {complaintDeadlines[o.id] && (
                      <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-foreground">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        {t("orders.complaint", { date: formatDateTime(complaintDeadlines[o.id]) })}
                      </p>
                    )}
                    {homeDelivery && o.delivery_address && (
                      <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-foreground">
                        <Truck className="h-4 w-4 shrink-0 text-primary" />
                        {t("orders:my.homeDelivery", { address: o.delivery_address })}
                      </p>
                    )}
                    {o.scheduled_pickup_at && (
                      <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-2.5 font-medium text-foreground">
                        <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                        {homeDelivery ? t("orders.deliveryAgreed") : t("orders.pickupScheduled")}:{" "}
                        {formatDateTime(o.scheduled_pickup_at, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    <p>
                      {t("orders.pickupDeadline")} <span className="font-medium text-foreground">{formatDate(o.pickup_deadline)}</span>
                    </p>
                  </div>
                )}
                {(o.status === "awaiting_pickup" || o.status === "delivered" || o.status === "expired") && (
                  <div className="mt-4 border-t border-border pt-4">
                    <OrderChat orderId={o.id} viewerRole="agricultor" deliveredAt={o.delivered_at} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orders.cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("orders.cancelText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("orders.keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelTarget) runAction(cancelTarget, "cancel_booking");
                setCancelTarget(null);
              }}
            >
              {t("orders:cancelBooking.button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ValidateDeliveryDialog
        order={validating}
        onOpenChange={(open) => { if (!open) setValidating(null); }}
        onValidated={async (orderId) => {
          markDelivered(orderId);
          // Produtos com escolha de lote: pergunta logo de que lote saíram.
          const pending = await ordersWithPendingLots([orderId]);
          if (pending.has(orderId)) {
            setPendingLotOrders((prev) => new Set(prev).add(orderId));
            setLotOrderId(orderId);
          }
        }}
      />
      <LotAllocationDialog
        orderId={lotOrderId}
        onOpenChange={(open) => !open && setLotOrderId(null)}
        onDone={() =>
          setPendingLotOrders((prev) => {
            const next = new Set(prev);
            if (lotOrderId) next.delete(lotOrderId);
            return next;
          })
        }
      />
    </main>
  );
};

export default FarmerOrders;
