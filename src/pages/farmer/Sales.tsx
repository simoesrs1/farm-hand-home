import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, Euro, Package, Trophy } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface Row {
  id: string;
  status: string;
  total: number;
  farmer_amount: number;
  created_at: string;
  order_items: { product_name: string; quantity: number; subtotal: number }[];
}

const RANGE_DAYS = 30;

const Sales = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - RANGE_DAYS * 86400000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("id,status,total,farmer_amount,created_at,order_items(product_name,quantity,subtotal)")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setOrders((data as Row[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const paid = useMemo(
    () => orders.filter((o) => o.status === "awaiting_pickup" || o.status === "delivered"),
    [orders],
  );

  const chartData = useMemo(() => {
    const map = new Map<string, { day: string; encomendas: number; receita: number }>();
    for (let i = RANGE_DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      map.set(key, {
        day: d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }),
        encomendas: 0,
        receita: 0,
      });
    }
    for (const o of paid) {
      const key = o.created_at.slice(0, 10);
      const entry = map.get(key);
      if (entry) {
        entry.encomendas += 1;
        entry.receita += o.farmer_amount;
      }
    }
    return [...map.values()];
  }, [paid]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of paid) {
      for (const it of o.order_items ?? []) {
        const cur = map.get(it.product_name) ?? { name: it.product_name, qty: 0, total: 0 };
        cur.qty += it.quantity;
        cur.total += it.subtotal;
        map.set(it.product_name, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [paid]);

  const revenue = paid.reduce((acc, o) => acc + o.farmer_amount, 0);
  const delivered = orders.filter((o) => o.status === "delivered").length;

  if (!user || profile?.profile_type !== "vendedor") {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">Esta área é exclusiva para agricultores.</p>
      </main>
    );
  }

  return (
    <main className="container max-w-5xl py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Início
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <TrendingUp className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold text-foreground">As minhas vendas</h1>
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <Euro className="h-3.5 w-3.5" /> Receita total (30 dias)
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">{revenue.toFixed(2)}€</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <Package className="h-3.5 w-3.5" /> Encomendas
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">{paid.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" /> Entregues
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">{delivered}</p>
            </div>
          </div>

          <section className="mb-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Encomendas por dia</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={Math.floor(RANGE_DAYS / 8)} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number, name) =>
                      name === "receita" ? [`${Number(value).toFixed(2)}€`, "Receita"] : [value, "Encomendas"]
                    }
                  />
                  <Bar dataKey="encomendas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Produtos mais vendidos</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há vendas registadas nos últimos 30 dias.</p>
            ) : (
              <ul className="space-y-2">
                {topProducts.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <p className="flex-1 truncate font-medium text-foreground">{p.name}</p>
                    <span className="text-sm text-muted-foreground">{p.qty} un.</span>
                    <span className="w-20 text-right font-medium text-foreground">{p.total.toFixed(2)}€</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default Sales;
