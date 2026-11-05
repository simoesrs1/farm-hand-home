import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Package, PackageCheck, RefreshCw, Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type TrackingRow = {
  status: string;
  accepted_at: string | null;
  packed_at: string | null;
  in_transit_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
};

type StepKey = "accepted_at" | "packed_at" | "in_transit_at" | "out_for_delivery_at" | "delivered_at";

const STEPS: { key: StepKey; label: string; Icon: typeof Package }[] = [
  { key: "accepted_at", label: "Aceite", Icon: CheckCircle2 },
  { key: "packed_at", label: "Embalado", Icon: Package },
  { key: "in_transit_at", label: "Em trânsito", Icon: Truck },
  { key: "out_for_delivery_at", label: "Para entrega", Icon: MapPin },
  { key: "delivered_at", label: "Entregue", Icon: PackageCheck },
];

const formatStamp = (iso: string) =>
  new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

interface DeliveryTrackingDialogProps {
  orderId: string | null;
  farmName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeliveryTrackingDialog = ({ orderId, farmName, open, onOpenChange }: DeliveryTrackingDialogProps) => {
  const [row, setRow] = useState<TrackingRow | null>(null);
  const [loading, setLoading] = useState(false);

  // Lê sempre o estado mais recente ao abrir: o agricultor pode ter avançado
  // um passo desde que a lista de encomendas foi carregada.
  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("status, accepted_at, packed_at, in_transit_at, out_for_delivery_at, delivered_at")
      .eq("id", orderId)
      .maybeSingle();
    setRow(data ?? null);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Entregue só com o QR code validado; nessa altura, os passos que o
  // agricultor não marcou contam como concluídos (sem data).
  const delivered = row?.status === "delivered";
  const isDone = (key: StepKey) => !!row?.[key] || delivered;
  const currentIndex = STEPS.reduce((acc, s, i) => (isDone(s.key) ? i : acc), -1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Acompanha a tua entrega</DialogTitle>
          <DialogDescription>
            {farmName ? `Encomenda de ${farmName}. ` : ""}A entrega fica concluída quando o agricultor
            lê o teu QR code.
          </DialogDescription>
        </DialogHeader>

        {loading && !row ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !row ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Não foi possível carregar o estado da entrega.
          </p>
        ) : (
          <ol className="py-2">
            {STEPS.map((s, i) => {
              const done = isDone(s.key);
              const current = i === currentIndex;
              const stamp = row[s.key];
              const isLast = i === STEPS.length - 1;
              return (
                <li key={s.key} className="relative flex gap-4 pb-5 last:pb-0">
                  {!isLast && (
                    <span
                      className={`absolute left-[15px] top-8 h-full w-px ${done && isDone(STEPS[i + 1].key) ? "bg-primary" : "bg-border"}`}
                      aria-hidden
                    />
                  )}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      current
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : done
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <s.Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                      {current && !delivered && (
                        <span className="ml-2 text-xs font-normal text-primary">Estado atual</span>
                      )}
                    </p>
                    {stamp && <p className="mt-0.5 text-xs text-muted-foreground">{formatStamp(stamp)}</p>}
                    {!done && s.key === "accepted_at" && (
                      <p className="mt-0.5 text-xs text-muted-foreground">A aguardar aceitação do agricultor</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryTrackingDialog;
