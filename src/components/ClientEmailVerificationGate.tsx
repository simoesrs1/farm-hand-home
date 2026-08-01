import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/auth-errors";

/**
 * Regras do perfil de cliente: o email tem de estar verificado através de um
 * código enviado por email. Enquanto não estiver, o modo cliente fica bloqueado
 * por um overlay centrado (o agricultor pode voltar ao seu perfil a qualquer momento).
 */
const ClientEmailVerificationGate = () => {
  const { user, activeMode, canSwitchProfile, switchMode, loading } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");

  const emailVerified = !!user?.email_confirmed_at;
  if (loading || !user || activeMode !== "cliente" || emailVerified) return null;

  const sendCode = async () => {
    if (!user.email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
      if (error) throw error;
      setSent(true);
      toast({ title: "Código enviado", description: "Verifique o seu email." });
    } catch (err) {
      toast({ title: "Erro", description: toUserMessage(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.email) return;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user.email,
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      toast({ title: "Email verificado", description: "Já pode comprar como cliente." });
    } catch (err) {
      toast({ title: "Código inválido", description: toUserMessage(err), variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Verifique o seu perfil de cliente</h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Para comprar como cliente precisa de confirmar o seu email com o código de 6 dígitos que lhe enviamos.
        </p>

        <form onSubmit={verifyCode} className="space-y-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-center text-lg tracking-[0.4em] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" className="w-full" disabled={verifying || code.trim().length < 6}>
            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar código
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={sendCode} disabled={sending}>
          {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {sent ? "Reenviar código" : "Enviar código por email"}
        </Button>

        {canSwitchProfile && (
          <button
            type="button"
            onClick={() => switchMode("vendedor")}
            className="mt-4 w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Voltar ao perfil de agricultor
          </button>
        )}
      </div>
    </div>
  );
};

export default ClientEmailVerificationGate;
