import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, CheckCircle2, XCircle, ArrowLeft, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Order {
  id: string;
  total: number;
  commission_amount: number;
  farmer_amount: number;
  status: "pending_payment" | "awaiting_pickup" | "delivered" | "expired";
  pickup_deadline: string;
  delivered_at: string | null;
  expired_at: string | null;
  created_at: string;
}

const meta = {
  awaiting_pickup: { label: "A aguardar", tone: "bg-primary/15 text-primary", Icon: Clock },
  delivered: { label: "Entregue", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", Icon: CheckCircle2 },
  expired: { label: "Expirada", tone: "bg-destructive/15 text-destructive", Icon: XCircle },
  pending_payment: { label: "Pendente", tone: "bg-muted text-muted-foreground", Icon: Clock },
} as const;

const FarmerOrders = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,commission_amount,farmer_amount,status,pickup_deadline,delivered_at,expired_at,created_at")
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

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
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-PT")}
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
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${m.tone}`}>
                    <Icon className="h-3.5 w-3.5" /> {m.label}
                  </span>
                </div>
                {o.status === "awaiting_pickup" && (
                  <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                    Prazo: <span className="font-medium text-foreground">{new Date(o.pickup_deadline).toLocaleDateString("pt-PT")}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
};

export default FarmerOrders;
