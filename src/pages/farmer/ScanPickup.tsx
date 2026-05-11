import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, ScanLine, Keyboard, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const SCANNER_ID = "qr-scanner-region";

const ScanPickup = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"camera" | "manual">("camera");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ amount: number } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const validatingRef = useRef(false);

  const validate = async (rawCode: string) => {
    if (validatingRef.current) return;
    validatingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-pickup", {
        body: { code: rawCode },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error ?? error?.message ?? "Erro ao validar";
        toast({ title: "Não foi possível validar", description: msg, variant: "destructive" });
        validatingRef.current = false;
      } else {
        setSuccess({ amount: (data as any).farmer_amount });
        toast({ title: "Entrega confirmada", description: `Recebes ${(data as any).farmer_amount.toFixed(2)}€` });
        // Stop camera after success
        if (scannerRef.current) {
          try { await scannerRef.current.stop(); } catch { /* noop */ }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "camera" || success) return;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    let mounted = true;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (!mounted) return;
          validate(decoded);
        },
        () => { /* ignore */ },
      )
      .catch((err) => {
        console.warn("camera start failed", err);
        toast({
          title: "Câmara indisponível",
          description: "Usa o modo manual para inserir o código.",
        });
      });
    return () => {
      mounted = false;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => { /* ignore */ });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, success]);

  if (!user || profile?.profile_type !== "vendedor") {
    return (
      <main className="container py-16 text-center">
        <p className="text-muted-foreground">Esta área é exclusiva para agricultores.</p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="container max-w-md py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Entrega confirmada</h1>
          <p className="mt-2 text-muted-foreground">
            Vais receber <span className="font-semibold text-primary">{success.amount.toFixed(2)}€</span> (90% do valor da encomenda).
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => { setSuccess(null); setCode(""); validatingRef.current = false; }}>
              Validar outra
            </Button>
            <Button variant="outline" onClick={() => navigate("/agricultor/encomendas")}>
              Ver encomendas
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-md py-8">
      <Link to="/agricultor/encomendas" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Encomendas
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <ScanLine className="h-7 w-7 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Validar entrega</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "camera" | "manual")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="camera" className="gap-2"><ScanLine className="h-4 w-4" /> Câmara</TabsTrigger>
          <TabsTrigger value="manual" className="gap-2"><Keyboard className="h-4 w-4" /> Código</TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="mt-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div id={SCANNER_ID} className="aspect-square w-full bg-black" />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Aponta a câmara ao QR code do cliente.
          </p>
        </TabsContent>

        <TabsContent value="manual" className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Código de levantamento</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXX"
              maxLength={11}
              className="font-mono text-lg tracking-[0.3em]"
            />
          </div>
          <Button
            disabled={loading || code.replace(/^FC:/, "").length !== 8}
            onClick={() => { validatingRef.current = false; validate(code); }}
            className="w-full"
          >
            {loading ? "A validar…" : "Confirmar entrega"}
          </Button>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default ScanPickup;
