import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Keyboard, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface ValidatePickupResponse {
  ok?: boolean;
  order_id?: string;
  farmer_amount?: number;
  error?: string;
}

interface Props {
  order: { id: string; pickup_code: string | null; farmer_amount: number | null } | null;
  onOpenChange: (open: boolean) => void;
  onValidated: (orderId: string, farmerAmount: number) => void;
}

const normalize = (raw: string | null | undefined) =>
  (raw ?? "").trim().toUpperCase().replace(/^FC:/, "");

const euros = (value: number | null | undefined) => `${(value ?? 0).toFixed(2)}€`;

const ValidateDeliveryDialog = ({ order, onOpenChange, onValidated }: Props) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"scan" | "manual">("scan");
  const [loading, setLoading] = useState(false);
  // Callback ref: the scanner is only built once the container is really in the DOM
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [code, setCode] = useState("");
  const busyRef = useRef(false);
  const orderId = order?.id ?? null;
  const scannerId = orderId ? `qr-inline-${orderId}` : "";
  const codeInputId = orderId ? `pickup-code-${orderId}` : "pickup-code";
  const codeReady = normalize(code).length === 8;

  // Start clean on the scan tab whenever a different order is opened
  useEffect(() => {
    if (orderId) {
      setTab("scan");
      setCode("");
    }
  }, [orderId]);

  const validate = async (rawCode: string) => {
    if (!order || busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<ValidatePickupResponse>("validate-pickup", {
        body: { code: rawCode },
      });
      if (error || data?.error || !data?.ok) {
        const msg = data?.error ?? error?.message ?? "Erro ao validar";
        toast({ title: "Não foi possível validar", description: msg, variant: "destructive" });
        return;
      }
      const amount = data.farmer_amount ?? order.farmer_amount ?? 0;
      onValidated(order.id, amount);
      toast({ title: "Entrega confirmada", description: `Recebes ${euros(amount)}` });
      onOpenChange(false);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const belongsToOrder = (raw: string) =>
    !!order?.pickup_code && normalize(raw) === normalize(order.pickup_code);

  const onScanned = (decoded: string) => {
    if (!order || busyRef.current) return;
    if (!belongsToOrder(decoded)) {
      busyRef.current = true;
      toast({
        title: "QR code de outra encomenda",
        description: "Este código não corresponde a esta encomenda.",
        variant: "destructive",
      });
      // Allow another attempt shortly after, without spamming the toast
      window.setTimeout(() => { busyRef.current = false; }, 2000);
      return;
    }
    validate(decoded);
  };

  const submitCode = () => {
    if (!belongsToOrder(code)) {
      toast({
        title: "Código incorreto",
        description: "Este código não corresponde a esta encomenda.",
        variant: "destructive",
      });
      return;
    }
    validate(code);
  };

  useEffect(() => {
    if (!orderId || tab !== "scan" || !container) return;

    const cameraUnavailable = (err: unknown) => {
      console.warn("inline scanner unavailable", err);
      toast({
        title: "Câmara indisponível",
        description: "Usa o separador \"Código\" para inserir o código do cliente.",
      });
    };

    let scanner: Html5Qrcode;
    try {
      scanner = new Html5Qrcode(container.id);
    } catch (err) {
      cameraUnavailable(err);
      return;
    }

    let mounted = true;
    try {
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decoded) => { if (mounted) onScanned(decoded); },
          () => { /* ignore per-frame decode errors */ },
        )
        .catch(cameraUnavailable);
    } catch (err) {
      cameraUnavailable(err);
    }

    return () => {
      mounted = false;
      (async () => {
        try {
          const state = (scanner as unknown as { getState?: () => number }).getState?.();
          // 2 === SCANNING, 3 === PAUSED
          if (state === 2 || state === 3) await scanner.stop();
        } catch { /* ignore */ }
        try { scanner.clear(); } catch { /* ignore */ }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, tab, container]);

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!loading) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Validar entrega</DialogTitle>
          <DialogDescription>
            {order && (
              <>
                Encomenda #{order.id.slice(0, 8).toUpperCase()} · vais receber{" "}
                <span className="font-medium text-primary">{euros(order.farmer_amount)}</span>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "scan" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-2"><ScanLine className="h-4 w-4" /> Ler QR</TabsTrigger>
            <TabsTrigger value="manual" className="gap-2"><Keyboard className="h-4 w-4" /> Código</TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {order && <div id={scannerId} ref={setContainer} className="aspect-square w-full bg-black" />}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {loading ? "A validar…" : "Aponta a câmara ao QR code do cliente."}
            </p>
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            <div>
              <label htmlFor={codeInputId} className="mb-1 block text-sm font-medium text-foreground">
                Código de levantamento
              </label>
              <Input
                id={codeInputId}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter" && codeReady && !loading) submitCode(); }}
                placeholder="XXXXXXXX"
                maxLength={11}
                autoComplete="off"
                className="font-mono text-lg tracking-[0.3em]"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Pede ao cliente o código de 8 caracteres que aparece por baixo do QR code.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button disabled={loading || !codeReady} onClick={submitCode}>
                {loading ? "A validar…" : "Confirmar entrega"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ValidateDeliveryDialog;
