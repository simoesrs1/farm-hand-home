import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ShoppingBag, Clock, CheckCircle2, XCircle, ArrowLeft, MapPin, Star, ChevronDown, ChevronUp } from "lucide-react";
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
  paid_at: string | null;
  delivered_at: string | null;
  accepted_at: string | null;
  created_at: string;
  farmer_id: string;
  farmer: FarmerRef | null;
  order_items: OrderItem[];
}

const statusMeta: Record<Order["status"], { label: string; tone: string; Icon: typeof Clock }> = {
  pending_payment: { label: "A aguardar pagamento", tone: "bg-muted text-muted-foreground", Icon: Clock },
  awaiting_pickup: { label: "A aguardar levantamento", tone: "bg-primary/15 text-primary", Icon: Clock },
  delivered: { label: "Levantada", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", Icon: CheckCircle2 },
  expired: { label: "Expirada", tone: "bg-destructive/15 text-destructive", Icon: XCircle },
  refunded: { label: "Devolvida (sem stock)", tone: "bg-destructive/15 text-destructive", Icon: XCircle },
};

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

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,status,pickup_code,pickup_deadline,paid_at,delivered_at,accepted_at,created_at,farmer_id,farmer:farmer_id(id,company_name,pickup_address,pickup_lat,pickup_lng),order_items(id,product_name,product_image,quantity,unit,unit_price,subtotal)")
        .order("created_at", { ascending: false });
      setOrders((data as unknown as Order[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

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
        <p className="text-muted-foreground">Inicia sessão para ver as tuas encomendas.</p>
        <Link to="/auth"><Button className="mt-4">Entrar</Button></Link>
      </main>
    );
  }

  const renderActiveCard = (o: Order) => {
    const meta = statusMeta[o.status];
    const Icon = meta.Icon;
    const url = mapsUrl(o.farmer);
    const isOpen = expanded[o.id] ?? true;
    return (
      <li key={o.id} className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {new Date(o.created_at).toLocaleString("pt-PT")}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground">
              <Link to={`/encomendas/${o.id}`} className="hover:underline">
                {o.farmer?.company_name ?? "Quinta"}
              </Link>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{o.total.toFixed(2)}€</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.tone}`}>
              <Icon className="h-3.5 w-3.5" /> {meta.label}
            </span>
            {o.status === "awaiting_pickup" && (
              <span className="text-[11px] text-muted-foreground">
                {o.accepted_at ? "Pedido aceite pelo agricultor" : "A aguardar aceitação do agricultor"}
              </span>
            )}
            <Link
              to={`/encomendas/${o.id}`}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Ver estado e levantamento →
            </Link>
          </div>
        </div>

        {o.farmer?.pickup_address && (
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
                  Abrir no Google Maps →
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
              Detalhes ({o.order_items.length} {o.order_items.length === 1 ? "artigo" : "artigos"})
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
                      <p className="font-medium text-foreground">{it.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.quantity} {it.unit ?? ""} × {it.unit_price.toFixed(2)}€
                      </p>
                    </div>
                    <p className="font-medium text-foreground">{it.subtotal.toFixed(2)}€</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {o.status === "awaiting_pickup" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Prazo: <span className="font-medium text-foreground">{new Date(o.pickup_deadline).toLocaleDateString("pt-PT")}</span>
            </p>
            <Button onClick={() => setSelected(o)}>Mostrar QR de levantamento</Button>
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
    return (
      <li key={o.id} className="rounded-2xl border border-border bg-muted/40 p-5 opacity-90">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {new Date(o.created_at).toLocaleString("pt-PT")}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground/80">
              <Link to={`/encomendas/${o.id}`} className="hover:underline">
                {o.farmer?.company_name ?? "Quinta"}
              </Link>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {o.total.toFixed(2)}€ · {o.order_items?.length ?? 0} {(o.order_items?.length ?? 0) === 1 ? "artigo" : "artigos"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.tone}`}>
              <Icon className="h-3.5 w-3.5" /> {meta.label}
            </span>
            <Link
              to={`/encomendas/${o.id}`}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Ver estado →
            </Link>
          </div>
        </div>

        {o.status === "delivered" && (
          <div className="mt-4 flex justify-end border-t border-border/60 pt-4">
            <Link to={`/avaliar/${o.id}`}>
              <Button variant="default" className="gap-2">
                <Star className="h-4 w-4" /> Avaliar agricultor
              </Button>
            </Link>
          </div>
        )}
      </li>
    );
  };

  return (
    <main className="container max-w-4xl py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Início
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <ShoppingBag className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold text-foreground">As minhas encomendas</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">Ainda não tens encomendas.</p>
          <Link to="/catalogo"><Button className="mt-4">Ver catálogo</Button></Link>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
              Ativas <span className="text-sm font-normal text-muted-foreground">({activeOrders.length})</span>
            </h2>
            {activeOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Não tens encomendas ativas.
              </p>
            ) : (
              <ul className="space-y-3">{activeOrders.map(renderActiveCard)}</ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
              Realizadas <span className="text-sm font-normal text-muted-foreground">({pastOrders.length})</span>
            </h2>
            {pastOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Ainda sem encomendas concluídas.
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
            <DialogTitle>Levantamento na quinta</DialogTitle>
            <DialogDescription>
              Mostra este QR code (ou o código abaixo) ao agricultor para levantar a encomenda.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={`FC:${selected.pickup_code}`} size={220} level="H" />
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Código</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-foreground">
                  {selected.pickup_code}
                </p>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Válido até {new Date(selected.pickup_deadline).toLocaleString("pt-PT")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default MyOrders;
