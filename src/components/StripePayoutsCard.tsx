import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentAccount {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

type Action = "onboard" | "dashboard" | "refresh";

/**
 * Conta Stripe do agricultor para receber pagamentos: configurar, continuar a
 * configuração ou abrir o painel. Ver docs/pagamentos-stripe-connect.md.
 */
const StripePayoutsCard = ({ userId }: { userId: string }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  // undefined: a carregar; null: ainda sem conta.
  const [account, setAccount] = useState<PaymentAccount | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const handledReturn = useRef(false);

  const callStripe = useCallback(async (action: Action) => {
    const { data, error } = await supabase.functions.invoke("stripe-connect", { body: { action } });
    const message = (data as { error?: string } | null)?.error;
    if (error || message) throw new Error(message ?? "Tente novamente dentro de momentos.");
    return data as { url?: string; account?: PaymentAccount | null };
  }, []);

  // Pede um link ao Stripe e abre-o nesta janela (o Stripe devolve o agricultor a esta página).
  const openStripe = useCallback(
    async (action: "onboard" | "dashboard") => {
      setBusy(action);
      try {
        const { url } = await callStripe(action);
        if (!url) throw new Error("Tente novamente dentro de momentos.");
        window.location.assign(url);
      } catch (e) {
        setBusy(null);
        toast({
          title: "Não foi possível abrir o Stripe",
          description: (e as Error).message,
          variant: "destructive",
        });
      }
    },
    [callStripe],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stripeParam = searchParams.get("stripe");
      if (stripeParam && !handledReturn.current) {
        handledReturn.current = true;
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("stripe");
            return next;
          },
          { replace: true },
        );
        // O link do Stripe expirou: pede um novo e volta ao formulário.
        if (stripeParam === "refresh") {
          await openStripe("onboard");
          return;
        }
        // Voltou do formulário: lê o estado atualizado no Stripe.
        if (stripeParam === "return") {
          setBusy("refresh");
          try {
            const { account: fresh } = await callStripe("refresh");
            if (!cancelled) setAccount(fresh ?? null);
          } catch {
            // Se falhar, mostra o último estado guardado (abaixo).
          } finally {
            if (!cancelled) setBusy(null);
          }
        }
      }

      const { data: farmer } = await supabase
        .from("farmer_details")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!farmer) {
        if (!cancelled) setFailed(true);
        return;
      }
      const { data, error } = await supabase
        .from("farmer_payment_accounts")
        .select("charges_enabled, payouts_enabled, details_submitted")
        .eq("farmer_id", farmer.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setFailed(true);
        return;
      }
      setAccount(data ?? null);
    })();
    return () => {
      cancelled = true;
    };
    // searchParams só é lido à entrada na página (regresso do Stripe).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (failed) return null;
  if (account === undefined) return <Skeleton className="mb-6 h-36 w-full rounded-2xl" />;

  const active = !!account?.details_submitted && !!account?.payouts_enabled;

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Receber pagamentos</h2>
        </div>
        {active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Ativo
          </span>
        ) : account ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-sm font-semibold text-warning">
            <AlertCircle className="h-4 w-4" /> Por concluir
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {active
          ? "A sua conta está pronta. Recebe o valor de cada encomenda na sua conta bancária depois de o cliente a levantar."
          : account
            ? "O Stripe ainda precisa de alguns dados para poder enviar-lhe os pagamentos. Continue a configuração para começar a vender."
            : "Os pagamentos dos clientes são processados pelo Stripe, um serviço de pagamentos seguro. Configure a sua conta (identificação, NIF e IBAN) para receber o valor das suas vendas."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {active ? (
          <Button variant="outline" onClick={() => openStripe("dashboard")} disabled={busy !== null}>
            {busy === "dashboard" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Ver painel de pagamentos
          </Button>
        ) : (
          <Button onClick={() => openStripe("onboard")} disabled={busy !== null}>
            {busy === "onboard" || busy === "refresh" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {account ? "Continuar configuração" : "Configurar pagamentos"}
          </Button>
        )}
      </div>
    </section>
  );
};

export default StripePayoutsCard;
