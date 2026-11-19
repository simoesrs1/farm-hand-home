import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Clock, CheckCircle2, XCircle, ArrowLeft, MapPin, Star, ChevronDown, ChevronUp, Truck, PackageX, Tent, BedDouble } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import OrderChat, { ReportDialog } from "@/components/OrderChat";
import ReviewRemovalDialog from "@/components/ReviewRemovalDialog";
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
import { toast } from "@/hooks/use-toast";
import { canFileDeliveryComplaint, reviewContext } from "@/lib/review-eligibility";
import { FREE_CANCEL_DAYS, cancellationQuote } from "@/lib/experience-pricing";
import { FunctionsHttpError } from "@supabase/supabase-js";
import DeliveryTrackingDialog from "@/components/DeliveryTrackingDialog";
import { formatDate, formatDateTime, formatEuro, unitLabel } from "@/lib/format";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
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
  paid_at: string | null;
  delivered_at: string | null;
  accepted_at: string | null;
  delivery_fee: number;
  created_at: string;
  delivery_address: string | null;
  delivery_tracking: boolean;
  expected_delivery_at: string | null;
  kind: string;
  booking_start: string | null;
  booking_end: string | null;
  booking_people: number | null;
  booking_units: number | null;
  booking_amount: number | null;
  cancelled_by: string | null;
  cancellation_fee: number | null;
  refund_amount: number | null;
  farmer_id: string;
  farmer: FarmerRef | null;
  order_items: OrderItem[];
}

const statusMeta: Record<Order["status"], { tone: string; Icon: typeof Clock }> = {
  pending_payment: { tone: "bg-muted text-muted-foreground", Icon: Clock },
  awaiting_pickup: { tone: "bg-info/15 text-info", Icon: Clock },
  delivered: { tone: "bg-success/15 text-success", Icon: CheckCircle2 },
  expired: { tone: "bg-destructive/15 text-destructive", Icon: XCircle },
  refunded: { tone: "bg-destructive/15 text-destructive", Icon: XCircle },
};

// Nas entregas ao domicílio fala-se de entrega, não de levantamento.
const HOME_DELIVERY_STATUSES = ["awaiting_pickup", "delivered"] as const;

// Reservas de experiências e alojamento.
const BOOKING_STATUSES = ["awaiting_pickup", "delivered", "expired"] as const;

const inList = <T extends string>(list: readonly T[], value: string): value is T =>
  (list as readonly string[]).includes(value);

const isHomeDelivery = (o: Order) => o.delivery_address != null;
const isBooking = (o: Order) => o.kind === "experience" || o.kind === "stay";

const statusLabel = (o: Order) => {
  if (isBooking(o)) {
    if (o.status === "refunded") {
      return i18n.t(o.cancelled_by === "farmer" ? "orders:status.cancelledByFarmer" : "orders:status.cancelled");
    }
    if (inList(BOOKING_STATUSES, o.status)) return i18n.t(`orders:status.booking.${o.status}`);
  } else if (isHomeDelivery(o) && inList(HOME_DELIVERY_STATUSES, o.status)) {
    return i18n.t(`orders:status.home.${o.status}`);
  }
  return i18n.t(`orders:status.${o.status}`);
};

const formatBookingStart = (iso: string) =>
  formatDateTime(iso, {
    timeZone: "Europe/Lisbon",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Linha da experiência ou do alojamento (as outras linhas da reserva são brindes). */
const bookingTitle = (o: Order) =>
  o.order_items?.find((it) => it.unit === "pessoa" || it.unit === "grupo" || it.unit === "noite")?.product_name ??
  i18n.t(o.kind === "stay" ? "orders:booking.stay" : "orders:booking.experience");

/** O mesmo título, traduzido quando vem de uma linha da encomenda. */
const bookingTitleNode = (o: Order) => {
  const line = o.order_items?.find((it) => it.unit === "pessoa" || it.unit === "grupo" || it.unit === "noite");
  return line ? (
    <TranslatedText type="order_item" id={line.id} field="product_name" text={line.product_name} />
  ) : (
    bookingTitle(o)
  );
};

const formatStayDate = (iso: string) =>
  formatDate(iso, { timeZone: "Europe/Lisbon", weekday: "short", day: "2-digit", month: "2-digit" });

/** Quando e para quantos: sessão da experiência ou datas do alojamento. */
const bookingDetails = (o: Order) =>
  o.kind === "stay" && o.booking_start && o.booking_end
    ? i18n.t("orders:booking.stayDetails", {
        checkIn: formatStayDate(o.booking_start),
        checkOut: formatStayDate(o.booking_end),
        guests: i18n.t("orders:booking.guests", { count: o.booking_people ?? 0 }),
        rooms: i18n.t("orders:booking.rooms", { count: o.booking_units ?? 0 }),
      })
    : o.booking_start
      ? `${formatBookingStart(o.booking_start)} · ${i18n.t("orders:booking.people", { count: o.booking_people ?? 0 })}`
      : "";



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

interface MyReview {
  review_id: string;
  removed: boolean;
  removal_status: string | null;
  photo_shown: boolean;
}

interface Complaint {
  status: string;
  deadline_at: string;
}

const MyOrders = () => {
  const { user } = useAuth();
  const { t } = useTranslation(["orders", "common", "account"]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tracking, setTracking] = useState<Order | null>(null);
  const [myReviews, setMyReviews] = useState<Record<string, MyReview>>({});
  const [complaints, setComplaints] = useState<Record<string, Complaint>>({});
  const [removalReviewId, setRemovalReviewId] = useState<string | null>(null);
  const [reportOrderId, setReportOrderId] = useState<string | null>(null);
  const [complaintOrder, setComplaintOrder] = useState<Order | null>(null);
  const [filing, setFiling] = useState(false);
  const [cancelBooking, setCancelBooking] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadReviewState = useCallback(async () => {
    const [{ data: reviews }, { data: rows }] = await Promise.all([
      supabase.rpc("my_order_reviews"),
      supabase.from("delivery_complaints").select("order_id, status, deadline_at"),
    ]);
    setMyReviews(Object.fromEntries((reviews ?? []).map((r) => [r.order_id, r])));
    setComplaints(Object.fromEntries((rows ?? []).map((c) => [c.order_id, c])));
  }, []);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("id,total,status,pickup_code,pickup_deadline,paid_at,delivered_at,accepted_at,created_at,delivery_address,delivery_tracking,expected_delivery_at,kind,booking_start,booking_end,booking_people,booking_units,booking_amount,cancelled_by,cancellation_fee,refund_amount,farmer_id,farmer:farmer_id(id,company_name,pickup_address,pickup_lat,pickup_lng),delivery_fee,order_items(id,product_name,product_image,quantity,unit,unit_price,subtotal)")
      .order("created_at", { ascending: false });
    setOrders((data as unknown as Order[]) ?? []);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await loadOrders();
      await loadReviewState();
      setLoading(false);
    })();
  }, [user, loadOrders, loadReviewState]);

  const { activeOrders, pastOrders } = useMemo(() => {
    const active: Order[] = [];
    const past: Order[] = [];
    for (const o of orders) {
      if (o.status === "delivered" || o.status === "expired" || o.status === "refunded") past.push(o);
      else active.push(o);
    }
    return { activeOrders: active, pastOrders: past };
  }, [orders]);

  if (!user) {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">{t("my.loginPrompt")}</p>
        <Link to="/auth"><Button className="mt-4">{t("my.login")}</Button></Link>
      </main>
    );
  }

  const fileComplaint = async () => {
    if (!complaintOrder) return;
    setFiling(true);
    const { error } = await supabase.rpc("file_delivery_complaint", { p_order_id: complaintOrder.id });
    setFiling(false);
    setComplaintOrder(null);
    if (error) {
      toast({ title: t("complaint.failed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("complaint.filed"), description: t("complaint.filedText") });
    loadReviewState();
  };

  const confirmCancelBooking = async () => {
    if (!cancelBooking) return;
    setCancelling(true);
    const { data, error } = await supabase.functions.invoke("cancel-booking", { body: { order_id: cancelBooking.id } });
    setCancelling(false);
    setCancelBooking(null);
    if (error || (data as { error?: string } | null)?.error) {
      let msg = (data as { error?: string } | null)?.error ?? t("my.tryAgain");
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          if (body?.error) msg = body.error;
        } catch {
          // resposta sem JSON: fica a mensagem genérica
        }
      }
      toast({ title: t("cancelBooking.failed"), description: msg, variant: "destructive" });
      return;
    }
    toast({ title: t("cancelBooking.done"), description: t("cancelBooking.refund", { amount: formatEuro(Number(data.refund_amount)) }) });
    loadOrders();
  };

  const complaintMessage = (c: Complaint) => {
    if (c.status === "open") {
      return new Date(c.deadline_at).getTime() > Date.now()
        ? t("complaint.open", { date: formatDateTime(c.deadline_at) })
        : t("complaint.overdue");
    }
    if (c.status === "rejected") return t("complaint.rejected");
    return null;
  };

  const hidePhoto = async (reviewId: string) => {
    const { error } = await supabase.rpc("hide_review_photo", { p_review_id: reviewId });
    if (error) {
      toast({ title: t("review.hidePhotoFailed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("review.photoHidden"), description: t("review.photoHiddenText") });
    loadReviewState();
  };

  // Avaliar / estado da avaliação, comum às encomendas ativas e concluídas.
  const renderReviewAction = (o: Order) => {
    const review = myReviews[o.id];
    if (!review) {
      if (!reviewContext(o)) return null;
      return (
        <Link to={`/avaliar/${o.id}`}>
          <Button variant="default" className="gap-2">
            <Star className="h-4 w-4" /> {t("review.rate")}
          </Button>
        </Link>
      );
    }
    if (review.removed) return <span className="text-xs text-muted-foreground">{t("review.deleted")}</span>;
    return (
      <>
        <Button variant="default" disabled className="gap-2">
          <Star className="h-4 w-4" /> {t("review.done")}
        </Button>
        {review.removal_status === "pending" ? (
          <span className="text-xs text-muted-foreground">{t("review.removalPending")}</span>
        ) : (
          <Button variant="outline" onClick={() => setRemovalReviewId(review.review_id)}>
            {t("review.requestRemoval")}
          </Button>
        )}
        {review.photo_shown && (
          <Button variant="outline" onClick={() => hidePhoto(review.review_id)}>
            {t("review.hidePhoto")}
          </Button>
        )}
      </>
    );
  };

  const renderActiveCard = (o: Order) => {
    const meta = statusMeta[o.status];
    const Icon = meta.Icon;
    const url = mapsUrl(o.farmer);
    const isOpen = expanded[o.id] ?? true;
    const home = isHomeDelivery(o);
    return (
      <li key={o.id} className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {formatDateTime(o.created_at)}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground">
              <Link to={`/encomendas/${o.id}`} className="hover:underline">
                {o.farmer?.company_name ?? t("my.farmFallback")}
              </Link>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{formatEuro(o.total)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.tone}`}>
              <Icon className="h-3.5 w-3.5" /> {statusLabel(o)}
            </span>
            {o.status === "awaiting_pickup" && (
              <span className="text-[11px] text-muted-foreground">
                {o.accepted_at ? t("my.accepted") : t("my.awaitingAcceptance")}
              </span>
            )}
            <Link
              to={`/encomendas/${o.id}`}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              {home ? t("my.viewStatus") : t("my.viewStatusPickup")}
            </Link>
          </div>
        </div>

        {isBooking(o) && o.booking_start && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 p-3">
            {o.kind === "stay" ? (
              <BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Tent className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <div className="text-sm">
              <p className="font-medium text-foreground">{bookingTitleNode(o)}</p>
              <p className="text-muted-foreground">{bookingDetails(o)}</p>
            </div>
          </div>
        )}

        {home ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-foreground">{t("my.homeDelivery", { address: o.delivery_address })}</p>
            </div>
            {o.delivery_tracking && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTracking(o)}>
                <Truck className="h-4 w-4" /> {t("my.track")}
              </Button>
            )}
          </div>
        ) : o.farmer?.pickup_address && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{o.farmer.pickup_address}</p>
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

        {o.order_items?.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setExpanded((s) => ({ ...s, [o.id]: !isOpen }))}
              className="flex w-full items-center justify-between text-sm font-medium text-foreground"
            >
              {t("my.details", { count: o.order_items.length })}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {isOpen && (
              <ul className="mt-3 space-y-2">
                {o.order_items.map((it) => (
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
                {o.delivery_fee > 0 && (
                  <li className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("my.homeDeliveryFee")}</span>
                    <span className="font-medium text-foreground">{formatEuro(o.delivery_fee)}</span>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {o.status === "awaiting_pickup" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {isBooking(o) ? (
              <Button variant="outline" onClick={() => setCancelBooking(o)}>{t("cancelBooking.button")}</Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("my.deadline")} <span className="font-medium text-foreground">{formatDate(o.pickup_deadline)}</span>
              </p>
            )}
            <Button onClick={() => setSelected(o)}>
              {isBooking(o) ? t("qr.showBooking") : home ? t("qr.showDelivery") : t("qr.showPickup")}
            </Button>
          </div>
        )}
        {canFileDeliveryComplaint(o) && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {complaints[o.id] ? (
              <p className="mr-auto text-sm text-muted-foreground">{complaintMessage(complaints[o.id])}</p>
            ) : (
              <Button variant="outline" className="gap-2" onClick={() => setComplaintOrder(o)}>
                <PackageX className="h-4 w-4" /> {t("complaint.button")}
              </Button>
            )}
            {renderReviewAction(o)}
          </div>
        )}
        {(o.status === "awaiting_pickup") && (
          <div className="mt-4 border-t border-border pt-4">
            <OrderChat orderId={o.id} viewerRole="cliente" deliveredAt={o.delivered_at} />
          </div>
        )}
      </li>
    );
  };

  const renderPastCard = (o: Order) => {
    const meta = statusMeta[o.status];
    const Icon = meta.Icon;
    const showTracking = o.delivery_tracking && o.status === "delivered";
    return (
      <li key={o.id} className="rounded-2xl border border-border bg-muted/40 p-5 opacity-90">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {formatDateTime(o.created_at)}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground/80">
              <Link to={`/encomendas/${o.id}`} className="hover:underline">
                {o.farmer?.company_name ?? t("my.farmFallback")}
              </Link>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatEuro(o.total)} · {t("my.items", { count: o.order_items?.length ?? 0 })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.tone}`}>
              <Icon className="h-3.5 w-3.5" /> {statusLabel(o)}
            </span>
            <Link
              to={`/encomendas/${o.id}`}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              {t("my.viewStatus")}
            </Link>
          </div>
        </div>

        {isBooking(o) && o.status === "refunded" && o.refund_amount != null && (
          <p className="mt-3 text-sm text-muted-foreground">
            {bookingTitleNode(o)}:{" "}
            {Number(o.cancellation_fee ?? 0) > 0
              ? t("cancelBooking.refundedWithFee", {
                  amount: formatEuro(Number(o.refund_amount)),
                  fee: formatEuro(Number(o.cancellation_fee)),
                })
              : t("cancelBooking.refunded", { amount: formatEuro(Number(o.refund_amount)) })}
          </p>
        )}

        {(o.status === "delivered" || o.status === "refunded") && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
            {showTracking && (
              <Button variant="outline" className="gap-2" onClick={() => setTracking(o)}>
                <Truck className="h-4 w-4" /> {t("my.track")}
              </Button>
            )}
            <ReportDialog
              orderId={o.id}
              reporterRole="cliente"
              open={reportOrderId === o.id}
              onOpenChange={(open) => setReportOrderId(open ? o.id : null)}
            />
            {renderReviewAction(o)}
          </div>
        )}
      </li>
    );
  };

  return (
    <main className="container max-w-4xl py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("my.home")}
      </Link>

      <PageHeader eyebrow={t("account:myAccount")} title={t("my.title")} />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">{t("my.empty")}</p>
          <Link to="/catalogo"><Button className="mt-4">{t("my.seeCatalog")}</Button></Link>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
              {t("my.active")} <span className="text-sm font-normal text-muted-foreground">({activeOrders.length})</span>
            </h2>
            {activeOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("my.noActive")}
              </p>
            ) : (
              <ul className="space-y-3">{activeOrders.map(renderActiveCard)}</ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
              {t("my.past")} <span className="text-sm font-normal text-muted-foreground">({pastOrders.length})</span>
            </h2>
            {pastOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("my.noPast")}
              </p>
            ) : (
              <ul className="space-y-3">{pastOrders.map(renderPastCard)}</ul>
            )}
          </section>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selected && isBooking(selected)
                ? t("qr.bookingTitle")
                : selected && isHomeDelivery(selected)
                  ? t("qr.deliveryTitle")
                  : t("qr.pickupTitle")}
            </DialogTitle>
            <DialogDescription>
              {selected && isBooking(selected)
                ? t("qr.bookingText")
                : selected && isHomeDelivery(selected)
                  ? t("qr.deliveryText")
                  : t("qr.pickupText")}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={`FC:${selected.pickup_code}`} size={220} level="H" />
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("qr.code")}</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                  {selected.pickup_code}
                </p>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {t("qr.validUntil", { date: formatDateTime(selected.pickup_deadline) })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelBooking} onOpenChange={(o) => !o && setCancelBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelBooking.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelBooking?.booking_start &&
                (() => {
                  const q = cancellationQuote(
                    Number(cancelBooking.booking_amount ?? 0),
                    cancelBooking.total,
                    new Date(cancelBooking.booking_start),
                  );
                  return q.free
                    ? t("cancelBooking.free", { count: FREE_CANCEL_DAYS, amount: formatEuro(q.refund) })
                    : t(cancelBooking.kind === "stay" ? "cancelBooking.feeStay" : "cancelBooking.feeExperience", {
                        count: FREE_CANCEL_DAYS,
                        fee: formatEuro(q.fee),
                        amount: formatEuro(q.refund),
                      });
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelBooking.keep")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelBooking} disabled={cancelling}>{t("cancelBooking.button")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReviewRemovalDialog
        reviewId={removalReviewId}
        onOpenChange={(open) => !open && setRemovalReviewId(null)}
        onSubmitted={loadReviewState}
      />

      <AlertDialog open={!!complaintOrder} onOpenChange={(o) => !o && setComplaintOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("complaint.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("complaint.text")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.back")}</AlertDialogCancel>
            <AlertDialogAction onClick={fileComplaint} disabled={filing}>{t("complaint.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeliveryTrackingDialog
        orderId={tracking?.id ?? null}
        farmName={tracking?.farmer?.company_name}
        open={tracking !== null}
        onOpenChange={(open) => !open && setTracking(null)}
      />
    </main>
  );
};

export default MyOrders;
