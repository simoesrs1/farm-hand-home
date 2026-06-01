import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ShoppingBag, Clock, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import OrderChat from "@/components/OrderChat";

interface Order {
  id: string;
  total: number;
  status: "pending_payment" | "awaiting_pickup" | "delivered" | "expired";
  pickup_code: string;
  pickup_deadline: string;
  paid_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

const statusMeta: Record<Order["status"], { label: string; tone: string; Icon: typeof Clock }> = {
  pending_payment: { label: "A aguardar pagamento", tone: "bg-muted text-muted-foreground", Icon: Clock },
  awaiting_pickup: { label: "A aguardar levantamento", tone: "bg-primary/15 text-primary", Icon: Clock },
  delivered: { label: "Levantada", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", Icon: CheckCircle2 },
  expired: { label: "Expirada", tone: "bg-destructive/15 text-destructive", Icon: XCircle },
};

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,status,pickup_code,pickup_deadline,paid_at,delivered_at,created_at")
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (!user) {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">Inicia sessão para ver as tuas encomendas.</p>
        <Link to="/auth"><Button className="mt-4">Entrar</Button></Link>
      </main>
    );
  }

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
        <ul className="space-y-3">
          {orders.map((o) => {
            const meta = statusMeta[o.status];
            const Icon = meta.Icon;
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-PT")}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-foreground">
                      {o.total.toFixed(2)}€
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.tone}`}>
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </span>
                </div>
                {o.status === "awaiting_pickup" && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      Prazo: <span className="font-medium text-foreground">{new Date(o.pickup_deadline).toLocaleDateString("pt-PT")}</span>
                    </p>
                    <Button onClick={() => setSelected(o)}>Mostrar QR de levantamento</Button>
                  </div>
                )}
                {(o.status === "awaiting_pickup" || o.status === "delivered" || o.status === "expired") && (
                  <div className="mt-4 border-t border-border pt-4">
                    <OrderChat orderId={o.id} viewerRole="cliente" deliveredAt={o.delivered_at} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
