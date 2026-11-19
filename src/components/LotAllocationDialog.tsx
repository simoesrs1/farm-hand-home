import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/format";

type PendingProduct = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  lots: { id: string; expires_at: string; quantity_remaining: number }[];
};

const formatDay = (iso: string) => formatDate(`${iso}T12:00:00Z`, { timeZone: "UTC" });

interface LotAllocationDialogProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/**
 * Depois de validar o QR code: o agricultor indica de que lote(s) saíram as
 * unidades vendidas. Só aí os lotes descem (o stock à venda já desceu na compra).
 */
const LotAllocationDialog = ({ orderId, onOpenChange, onDone }: LotAllocationDialogProps) => {
  const { t } = useTranslation("farmer");
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: pending } = await supabase
        .from("order_lot_allocations")
        .select("product_id, quantity, product:product_id(name, unit)")
        .eq("order_id", orderId)
        .is("batch_id", null);
      const byProduct = new Map<string, PendingProduct>();
      for (const row of (pending ?? []) as unknown as { product_id: string; quantity: number; product: { name: string; unit: string } | null }[]) {
        const cur = byProduct.get(row.product_id);
        if (cur) cur.quantity += Number(row.quantity);
        else byProduct.set(row.product_id, { productId: row.product_id, name: row.product?.name ?? "Produto", unit: row.product?.unit ?? "", quantity: Number(row.quantity), lots: [] });
      }
      const ids = [...byProduct.keys()];
      if (ids.length) {
        const { data: lots } = await supabase
          .from("product_stock_batches")
          .select("id, product_id, expires_at, quantity_remaining")
          .in("product_id", ids)
          .gt("quantity_remaining", 0)
          .not("expires_at", "is", null)
          .order("expires_at", { ascending: true })
          .order("added_at", { ascending: true });
        for (const l of lots ?? []) byProduct.get(l.product_id)?.lots.push({ id: l.id, expires_at: l.expires_at!, quantity_remaining: Number(l.quantity_remaining) });
      }
      if (cancelled) return;
      const list = [...byProduct.values()];
      // Sugestão: o lote com a validade mais próxima primeiro (o agricultor pode mudar).
      const suggestion: Record<string, string> = {};
      for (const p of list) {
        let left = p.quantity;
        for (const l of p.lots) {
          const take = Math.min(left, l.quantity_remaining);
          suggestion[`${p.productId}:${l.id}`] = take > 0 ? String(take) : "";
          left -= take;
        }
      }
      setProducts(list);
      setAmounts(suggestion);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const totalFor = (p: PendingProduct) =>
    p.lots.reduce((acc, l) => acc + (Number((amounts[`${p.productId}:${l.id}`] ?? "").replace(",", ".")) || 0), 0);

  const save = async () => {
    if (!orderId) return;
    const wrong = products.find((p) => totalFor(p) !== p.quantity);
    if (wrong) {
      toast({ title: t("lots.indicate", { quantity: wrong.quantity, unit: wrong.unit, name: wrong.name }), variant: "destructive" });
      return;
    }
    const allocations = products.flatMap((p) =>
      p.lots
        .map((l) => ({ product_id: p.productId, batch_id: l.id, quantity: Number((amounts[`${p.productId}:${l.id}`] ?? "").replace(",", ".")) || 0 }))
        .filter((a) => a.quantity > 0),
    );
    setSaving(true);
    const { error } = await supabase.rpc("allocate_order_lots", { p_order_id: orderId, p_allocations: allocations });
    setSaving(false);
    if (error) {
      toast({ title: t("lots.failed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("lots.saved"), description: t("lots.savedText") });
    onDone?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={!!orderId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("lots.title")}</DialogTitle>
          <DialogDescription>
            {t("lots.description")}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t("lots.none")}</p>
        ) : (
          <div className="space-y-5">
            {products.map((p) => {
              const total = totalFor(p);
              return (
                <div key={p.productId} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className={`text-xs ${total === p.quantity ? "text-primary" : "text-destructive"}`}>
                      {t("lots.progress", { total, quantity: p.quantity, unit: p.unit })}
                    </p>
                  </div>
                  {p.lots.length === 0 ? (
                    <p className="text-sm text-destructive">{t("lots.noLots")}</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {p.lots.map((l) => (
                        <li key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                          <span className="flex-1 text-foreground">
                            {t("lots.lotLine", { date: formatDay(l.expires_at), quantity: l.quantity_remaining, unit: p.unit })}
                          </span>
                          <Input
                            inputMode="decimal"
                            value={amounts[`${p.productId}:${l.id}`] ?? ""}
                            onChange={(e) => setAmounts((a) => ({ ...a, [`${p.productId}:${l.id}`]: e.target.value }))}
                            placeholder="0"
                            className="h-8 w-20"
                            aria-label={t("lots.lotAria", { date: formatDay(l.expires_at) })}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("lots.later")}</Button>
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("lots.save")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LotAllocationDialog;
