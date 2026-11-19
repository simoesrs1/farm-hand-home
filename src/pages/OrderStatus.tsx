import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  MapPin,
  CreditCard,
  CalendarClock,
  RefreshCw,
  Package,
  Truck,
  Navigation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import OrderChat from "@/components/OrderChat";
import { formatDate, formatDateTime, formatEuro, formatTime, unitLabel } from "@/lib/format";
import { Trans, useTranslation } from "react-i18next";
import TranslatedText from "@/components/TranslatedText";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  subtotal: number;
}

interface FarmerRef {
  id: string;
  company_name: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
}

interface Order {
  id: string;
  total: number;
  status: "pending_payment" | "awaiting_pickup" | "delivered" | "expired" | "refunded";
  pickup_code: string;
  pickup_deadline: string;
  scheduled_pickup_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  accepted_at: string | null;
  delivery_fee: number;
  delivery_address: string | null;
  delivery_tracking: boolean;
  expected_delivery_at: string | null;
  packed_at: string | null;
  in_transit_at: string | null;
  out_for_delivery_at: string | null;
  kind: string;
  expired_at: string | null;
  created_at: string;
  farmer_id: string;
  farmer: FarmerRef | null;
  order_items: OrderItem[];
}

const mapsUrl = (f: FarmerRef | null) => {
  if (!f) return null;
  if (f.pickup_lat != null && f.pickup_lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${f.pickup_lat},${f.pickup_lng}`;
  }
  if (f.pickup_address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.pickup_address)}`;
  }
  return null;
};

const formatLongDate = (iso: string | null) =>
  iso ? formatDate(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : null;

const formatHour = (iso: string | null) => (iso ? formatTime(iso) : null);

type StepKey = "pending" | "accepted" | "packed" | "in_transit" | "out_for_delivery" | "delivered" | "problem";

// Passos do acompanhamento da entrega, marcados pelo agricultor (ver order-action).
const TRACKING_STEPS = [
  { key: "packed", column: "packed_at", Icon: Package },
  { key: "in_transit", column: "in_transit_at", Icon: Truck },
  { key: "out_for_delivery", column: "out_for_delivery_at", Icon: Navigation },
] as const;

const OrderStatus = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation(["orders", "common"]);
  // "terça-feira, 19 de novembro de 2026 às 10:30"
  const at = (iso: string | null) => t("statusPage.at", { date: formatLongDate(iso), time: formatHour(iso) });

  const fetchOrder = async () => {
    if (!id) return;
    setRefreshing(true);
    const { data } = await supabase
      .from("orders")
      .select(
        "id,total,status,pickup_code,pickup_deadline,scheduled_pickup_at,paid_at,delivered_at,accepted_at,expired_at,created_at,farmer_id,farmer:farmer_id(id,company_name,pickup_address,pickup_lat,pickup_lng),delivery_fee,delivery_address,delivery_tracking,expected_delivery_at,packed_at,in_transit_at,out_for_delivery_at,kind,order_items(id,product_name,product_image,quantity,unit,unit_price,subtotal)"
      )
      .eq("id", id)
      .maybeSingle();
    setOrder((data as unknown as Order) ?? null);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  useEffect(() => {
    if (!user || !id || !order) return;
    const channel = supabase
      .channel(`order-status-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => fetchOrder()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id, order?.status]);

  if (!user) {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">{t("statusPage.loginPrompt")}</p>
        <Link to="/auth"><Button className="mt-4">{t("my.login")}</Button></Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="container max-w-3xl py-8">
        <Skeleton className="mb-6 h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="container max-w-3xl py-16 text-center">
        <p className="text-muted-foreground">{t("statusPage.notFound")}</p>
        <Link to="/encomendas"><Button className="mt-4">{t("my.title")}</Button></Link>
      </main>
    );
  }

  // Reserva de experiência: a sessão faz as vezes do levantamento.
  const isBooking = order.kind === "experience" || order.kind === "stay";
  const isStay = order.kind === "stay";
  // Entrega ao domicílio: o cliente escolheu receber em casa (tem morada de entrega).
  const isDelivery = !isBooking && order.delivery_address != null;

  const trackingSteps: { key: StepKey; label: string; description: string; Icon: typeof Clock; done: boolean }[] =
    isDelivery && order.delivery_tracking
      ? TRACKING_STEPS.map((s) => {
          const doneAt = order[s.column];
          return {
            key: s.key,
            label: t(`statusPage.tracking.${s.key}`),
            description: doneAt ? at(doneAt) : "",
            Icon: s.Icon,
            done: !!doneAt || order.status === "delivered",
          };
        })
      : [];

  const kindKey = isStay ? "stay" : isBooking ? "experience" : isDelivery ? "delivery" : "pickup";
  const deliveredLabel = t(
    order.status === "delivered" ? `statusPage.done.${kindKey}` : `statusPage.waiting.${kindKey}`,
  );

  const deliveredDescription =
    order.status === "delivered" && order.delivered_at
      ? `${t(`statusPage.confirmed.${kindKey}`)} · ${at(order.delivered_at)}`
      : order.scheduled_pickup_at
        ? `${t(`statusPage.scheduled.${kindKey}`)} · ${at(order.scheduled_pickup_at)}`
        : isDelivery && order.expected_delivery_at && order.status === "awaiting_pickup"
          ? `${t("statusPage.expectedDelivery")} · ${formatLongDate(order.expected_delivery_at)}`
          : order.status === "awaiting_pickup"
            ? `${t("statusPage.deadline")} · ${formatLongDate(order.pickup_deadline)}`
            : "";

  const steps: { key: StepKey; label: string; description: string; Icon: typeof Clock; done: boolean; failed?: boolean }[] = [
    {
      key: "pending",
      label: t("statusPage.pending"),
      description: order.paid_at ? `${t("statusPage.paid")} · ${at(order.paid_at)}` : t("statusPage.awaitingPayment"),
      Icon: CreditCard,
      done: order.status !== "pending_payment" || !!order.paid_at,
      failed: order.status === "pending_payment" && !order.paid_at ? false : false,
    },
    {
      key: "accepted",
      label: order.accepted_at ? t("my.accepted") : t("statusPage.awaitingAcceptance"),
      description: order.accepted_at
        ? `${t("statusPage.acceptedShort")} · ${at(order.accepted_at)}`
        : t("statusPage.acceptSoon"),
      Icon: CheckCircle2,
      done: !!order.accepted_at,
    },
    ...trackingSteps,
    {
      key: "delivered",
      label: deliveredLabel,
      description: deliveredDescription,
      Icon: PackageCheck,
      done: order.status === "delivered",
    },
  ];

  const problemStep: { label: string; description: string; detail: string | null } | null =
    order.status === "refunded"
      ? {
          label: t("status.refunded"),
          description: t("statusPage.refundedText"),
          detail: null,
        }
      : order.status === "expired"
        ? {
            label: t("statusPage.expired"),
            description: t("statusPage.expiredText"),
            detail: order.expired_at ? `${t("statusPage.expiredAt")} · ${at(order.expired_at)}` : null,
          }
        : null;

  const isActive = order.status === "pending_payment" || order.status === "awaiting_pickup";
  const url = mapsUrl(order.farmer);

  return (
    <main className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/encomendas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("my.title")}
        </Link>
        <button
          type="button"
          onClick={fetchOrder}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          aria-label={t("statusPage.refreshAria")}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {t("statusPage.refresh")}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {order.farmer?.company_name ?? t("statusPage.orderFallback")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("statusPage.orderedOn", { when: at(order.created_at) })}
            </p>
          </div>
          <p className="font-mono tabular-nums text-xl font-semibold text-foreground">{formatEuro(order.total)}</p>
        </div>

        {/* Linha temporal do estado */}
        <ol className="mt-6 space-y-0">
          {steps.map((s, i) => {
            const Icon = s.Icon;
            const isLast = i === steps.length - 1;
            return (
              <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast && <span className="absolute left-[15px] top-8 h-full w-px bg-border" aria-hidden />}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    s.done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 pt-1">
                  <p className={`text-sm font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                  {s.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                  )}
                </div>
              </li>
            );
          })}

          {problemStep && (
            <li className="flex gap-4 pt-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <XCircle className="h-4 w-4" />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-sm font-medium text-destructive">{problemStep.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{problemStep.description}</p>
                {problemStep.detail && <p className="mt-0.5 text-sm text-muted-foreground">{problemStep.detail}</p>}
              </div>
            </li>
          )}
        </ol>

        {/* Data e hora do levantamento ou da entrega */}
        {isActive && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-primary/10 p-4">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDelivery ? t("statusPage.deliveryDateTime") : t("statusPage.pickupDateTime")}
              </p>
              {order.scheduled_pickup_at ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <Trans
                    t={t}
                    i18nKey="statusPage.atBold"
                    values={{ date: formatLongDate(order.scheduled_pickup_at), time: formatHour(order.scheduled_pickup_at) }}
                    components={{ b: <span className="font-semibold text-foreground" /> }}
                  />
                </p>
              ) : isDelivery && order.expected_delivery_at ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("statusPage.noTimeDelivery", { date: formatLongDate(order.expected_delivery_at) })}
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("statusPage.noTime", { date: formatLongDate(order.pickup_deadline) })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* QR de levantamento ou de entrega */}
        {order.status === "awaiting_pickup" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isDelivery ? t("statusPage.qrDelivery") : t("statusPage.qrPickup")}
            </p>
            <Button onClick={() => setShowQr(true)}>
              {isDelivery ? t("qr.showDelivery") : t("qr.showPickup")}
            </Button>
          </div>
        )}

        {isDelivery ? (
          <div className="mt-6 flex items-start gap-2 border-t border-border pt-4">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{t("statusPage.deliveryAt")}</p>
              <p className="text-sm text-foreground">{order.delivery_address}</p>
            </div>
          </div>
        ) : order.farmer?.pickup_address && (
          <div className="mt-6 flex items-start gap-2 border-t border-border pt-4">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{order.farmer.pickup_address}</p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
                >
                  {t("my.openMaps")}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Artigos */}
        {order.order_items?.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">
              {t("my.items", { count: order.order_items.length })}
            </p>
            <ul className="mt-3 space-y-2">
              {order.order_items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 text-sm">
                  {it.product_image && (
                    <img src={it.product_image} alt={it.product_name} className="h-10 w-10 rounded-md object-cover" />
                  )}
                  <div className="flex-1">
                    <TranslatedText type="order_item" id={it.id} field="product_name" text={it.product_name} as="p" className="font-medium text-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {it.quantity} {unitLabel(it.unit, it.quantity)} × {formatEuro(it.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium text-foreground">{formatEuro(it.subtotal)}</p>
                </li>
              ))}
              {order.delivery_fee > 0 && (
                <li className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("my.homeDeliveryFee")}</span>
                  <span className="font-medium text-foreground">{formatEuro(order.delivery_fee)}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Chat */}
        {order.status === "awaiting_pickup" && (
          <div className="mt-4 border-t border-border pt-4">
            <OrderChat orderId={order.id} viewerRole="cliente" deliveredAt={order.delivered_at} />
          </div>
        )}

        {order.status === "delivered" && (
          <div className="mt-4 flex justify-end border-t border-border pt-4">
            <Link to={`/avaliar/${order.id}`}>
              <Button>{t("review.rate")}</Button>
            </Link>
          </div>
        )}
      </div>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isDelivery ? t("qr.deliveryTitle") : t("qr.pickupTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG value={`FC:${order.pickup_code}`} size={220} level="H" />
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("qr.code")}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                {order.pickup_code}
              </p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {t("qr.validUntil", { date: formatDateTime(order.pickup_deadline) })}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default OrderStatus;
