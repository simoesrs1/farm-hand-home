import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package, Clock, CheckCircle2, XCircle, ArrowLeft, ScanLine, ThumbsUp, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import OrderChat from "@/components/OrderChat";
import ValidateDeliveryDialog from "@/components/ValidateDeliveryDialog";

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
  delivered_at: string | null;
  expired_at: string | null;
  accepted_at: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const meta = {
  awaiting_pickup: { label: "A aguardar", tone: "bg-primary/15 text-primary", Icon: Clock },
  delivered: { label: "Entregue", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", Icon: CheckCircle2 },
  expired: { label: "Expirada", tone: "bg-destructive/15 text-destructive", Icon: XCircle },
  refunded: { label: "Devolvida (sem stock)", tone: "bg-destructive/15 text-destructive", Icon: XCircle },
  pending_payment: { label: "Pendente", tone: "bg-muted text-muted-foreground", Icon: Clock },
} as const;

const FarmerOrders = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("id");
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  const [validating, setValidating] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,commission_amount,farmer_amount,status,pickup_deadline,pickup_code,delivered_at,expired_at,accepted_at,created_at,order_items(id,product_name,product_image,quantity,unit,unit_price,subtotal)")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      }
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

  const runAction = async (order: Order, action: "accept" | "refund_no_stock") => {
    setActing(order.id);
    const { data, error } = await supabase.functions.invoke("order-action", {
      body: { order_id: order.id, action },
    });
    setActing(null);
    const message = (data as { error?: string } | null)?.error;
    if (error || message) {
      toast({
        title: "Não foi possível concluir",
        description: message ?? "Tenta novamente dentro de momentos.",
        variant: "destructive",
      });
      return;
    }
    if (action === "accept") {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, accepted_at: new Date().toISOString() } : o)),
      );
      toast({ title: "Pedido aceite", description: "O cliente foi notificado." });
    } else {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "refunded" } : o)));
      toast({ title: "Encomenda devolvida", description: "O cliente foi notificado da falta de stock." });
    }
  };


  if (!user || profile?.profile_type !== "vendedor") {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">Esta área é exclusiva para agricultores.</p>
      </main>
    );
  }

  const earnedDelivered = orders
    .filter((o) => o.status === "delivered")
    .reduce((acc, o) => acc + o.farmer_amount, 0);
  const earnedExpired = orders
    .filter((o) => o.status === "expired")
    .reduce((acc, o) => acc + Math.round(o.total * 0.1 * 100) / 100, 0);

  return (
    <main className="container max-w-5xl py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Início
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">Encomendas da tua quinta</h1>
        </div>
        <Link to="/agricultor/scan">
          <Button className="gap-2"><ScanLine className="h-4 w-4" /> Validar entrega</Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">A aguardar</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {orders.filter((o) => o.status === "awaiting_pickup").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recebido (entregues)</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">{earnedDelivered.toFixed(2)}€</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Compensação (expiradas)</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{earnedExpired.toFixed(2)}€</p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          Ainda não recebeste encomendas.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const m = meta[o.status];
            const Icon = m.Icon;
            const farmerGets =
              o.status === "delivered"
                ? o.farmer_amount
                : o.status === "expired"
                ? Math.round(o.total * 0.1 * 100) / 100
                : o.farmer_amount;
            const isHighlighted = highlightId === o.id;
            return (
              <li
                key={o.id}
                ref={(el) => { refs.current[o.id] = el; }}
                className={`rounded-2xl border bg-card p-5 transition-all ${isHighlighted ? "border-primary ring-2 ring-primary/30 shadow-lg" : "border-border"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Encomenda #{o.id.slice(0, 8).toUpperCase()} · {new Date(o.created_at).toLocaleString("pt-PT")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Total: <span className="font-medium text-foreground">{o.total.toFixed(2)}€</span>
                      {" · "}
                      Comissão (10%): <span className="font-medium text-foreground">{o.commission_amount.toFixed(2)}€</span>
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-primary">
                      {o.status === "delivered" ? "Recebes" : o.status === "expired" ? "Recebeste" : "Vais receber"}: {farmerGets.toFixed(2)}€
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${m.tone}`}>
                      <Icon className="h-3.5 w-3.5" /> {m.label}
                    </span>
                    {o.status === "awaiting_pickup" && !o.accepted_at && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={acting === o.id}
                          onClick={() => runAction(o, "accept")}
                        >
                          <ThumbsUp className="h-4 w-4" /> Aceitar pedido
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          disabled={acting === o.id}
                          onClick={() => runAction(o, "refund_no_stock")}
                        >
                          <Undo2 className="h-4 w-4" /> Devolver (sem stock)
                        </Button>
                      </>
                    )}
                    {o.status === "awaiting_pickup" && o.accepted_at && (
                      <Button size="sm" className="gap-1.5" onClick={() => setValidating(o)}>
                        <ScanLine className="h-4 w-4" /> Validar entrega
                      </Button>
                    )}
                  </div>
                </div>

                {o.order_items?.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-border pt-4">
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

                {o.status === "awaiting_pickup" && (
                  <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                    Prazo de levantamento: <span className="font-medium text-foreground">{new Date(o.pickup_deadline).toLocaleDateString("pt-PT")}</span>
                  </p>
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

      <ValidateDeliveryDialog
        order={validating}
        onOpenChange={(open) => { if (!open) setValidating(null); }}
        onValidated={(orderId) => markDelivered(orderId)}
      />
    </main>
  );
};

export default FarmerOrders;
