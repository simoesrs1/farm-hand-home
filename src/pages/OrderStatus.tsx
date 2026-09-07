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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import OrderChat from "@/components/OrderChat";

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

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : null;

type StepKey = "pending" | "accepted" | "delivered" | "problem";

const OrderStatus = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async () => {
    if (!id) return;
    setRefreshing(true);
    const { data } = await supabase
      .from("orders")
      .select(
        "id,total,status,pickup_code,pickup_deadline,scheduled_pickup_at,paid_at,delivered_at,accepted_at,expired_at,created_at,farmer_id,farmer:farmer_id(id,company_name,pickup_address,pickup_lat,pickup_lng),order_items(id,product_name,product_image,quantity,unit,unit_price,subtotal)"
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
        <p className="text-muted-foreground">Inicia sessão para ver o estado das tuas encomendas.</p>
        <Link to="/auth"><Button className="mt-4">Entrar</Button></Link>
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
        <p className="text-muted-foreground">Encomenda não encontrada.</p>
        <Link to="/encomendas"><Button className="mt-4">As minhas encomendas</Button></Link>
      </main>
    );
  }

  const steps: { key: StepKey; label: string; description: string; Icon: typeof Clock; done: boolean; failed?: boolean }[] = [
    {
      key: "pending",
      label: "Encomenda pendente",
      description: order.paid_at
        ? `Pagamento confirmado · ${formatDate(order.paid_at)} às ${formatTime(order.paid_at)}`
        : "A aguardar confirmação do pagamento",
      Icon: CreditCard,
      done: order.status !== "pending_payment" || !!order.paid_at,
      failed: order.status === "pending_payment" && !order.paid_at ? false : false,
    },
    {
      key: "accepted",
      label: order.accepted_at ? "Aceite pelo agricultor" : "À espera de aceitação",
      description: order.accepted_at
        ? `Aceite · ${formatDate(order.accepted_at)} às ${formatTime(order.accepted_at)}`
        : "O agricultor vai confirmar a tua encomenda em breve",
      Icon: CheckCircle2,
      done: !!order.accepted_at,
    },
    {
      key: "delivered",
      label: order.status === "delivered" ? "Levantada" : "Pronta para levantamento",
      description:
        order.status === "delivered" && order.delivered_at
          ? `Levantamento concluído · ${formatDate(order.delivered_at)} às ${formatTime(order.delivered_at)}`
          : order.scheduled_pickup_at
            ? `Levantamento agendado · ${formatDate(order.scheduled_pickup_at)} às ${formatTime(order.scheduled_pickup_at)}`
            : order.status === "awaiting_pickup"
              ? `Prazo limite · ${formatDate(order.pickup_deadline)}`
              : "",
      Icon: PackageCheck,
      done: order.status === "delivered",
    },
  ];

  const problemStep: { label: string; description: string; detail: string | null } | null =
    order.status === "refunded"
      ? {
          label: "Devolvida",
          description: "O valor foi devolvido — sem stock ou encomenda cancelada.",
          detail: null,
        }
      : order.status === "expired"
        ? {
            label: "Expirada (não levantada)",
            description: "A encomenda não foi levantada dentro do prazo e expirou.",
            detail: order.expired_at ? `Expirou · ${formatDate(order.expired_at)} às ${formatTime(order.expired_at)}` : null,
          }
        : null;

  const isActive = order.status === "pending_payment" || order.status === "awaiting_pickup";
  const url = mapsUrl(order.farmer);

  return (
    <main className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/encomendas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> As minhas encomendas
        </Link>
        <button
          type="button"
          onClick={fetchOrder}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Atualizar estado"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {order.farmer?.company_name ?? "Encomenda"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Encomendada em {formatDate(order.created_at)} às {formatTime(order.created_at)}
            </p>
          </div>
          <p className="font-display text-xl font-semibold text-foreground">{order.total.toFixed(2)}€</p>
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
                    s.done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
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

        {/* Data e hora do levantamento */}
        {isActive && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-primary/10 p-4">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Data e hora do levantamento</p>
              {order.scheduled_pickup_at ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatDate(order.scheduled_pickup_at)} às{" "}
                  <span className="font-semibold text-foreground">{formatTime(order.scheduled_pickup_at)}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Sem horário agendado — prazo limite: {formatDate(order.pickup_deadline)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* QR de levantamento */}
        {order.status === "awaiting_pickup" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Mostra o QR ao agricultor no levantamento.
            </p>
            <Button onClick={() => setShowQr(true)}>Mostrar QR de levantamento</Button>
          </div>
        )}

        {order.farmer?.pickup_address && (
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
                  Abrir no Google Maps →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Artigos */}
        {order.order_items?.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">
              {order.order_items.length} {order.order_items.length === 1 ? "artigo" : "artigos"}
            </p>
            <ul className="mt-3 space-y-2">
              {order.order_items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 text-sm">
                  {it.product_image && (
                    <img src={it.product_image} alt={it.product_name} className="h-10 w-10 rounded-md object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{it.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.quantity} {it.unit ?? ""} × {it.unit_price.toFixed(2)}€
                    </p>
                  </div>
                  <p className="font-medium text-foreground">{it.subtotal.toFixed(2)}€</p>
                </li>
              ))}
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
              <Button>Avaliar agricultor</Button>
            </Link>
          </div>
        )}
      </div>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Levantamento na quinta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG value={`FC:${order.pickup_code}`} size={220} level="H" />
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Código</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                {order.pickup_code}
              </p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Válido até {new Date(order.pickup_deadline).toLocaleString("pt-PT")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default OrderStatus;
