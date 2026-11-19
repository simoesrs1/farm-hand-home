import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/auth-errors";
import { useTranslation } from "react-i18next";

/**
 * Regras do perfil de cliente: o email tem de estar verificado através de um
 * código enviado por email. Enquanto não estiver, o modo cliente fica bloqueado
 * por um overlay centrado (o agricultor pode voltar ao seu perfil a qualquer momento).
 */
const ClientEmailVerificationGate = () => {
  const { user, activeMode, canSwitchProfile, switchMode, loading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(["account", "common"]);
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
      toast({ title: t("verify.sent"), description: t("verify.sentText") });
    } catch (err) {
      toast({ title: t("auth.error"), description: toUserMessage(err), variant: "destructive" });
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
      toast({ title: t("verify.verified"), description: t("verify.verifiedText") });
    } catch (err) {
      toast({ title: t("verify.invalid"), description: toUserMessage(err), variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="font-display text-xl text-foreground">{t("verify.title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {t("verify.text")}
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
            {t("verify.confirm")}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={sendCode} disabled={sending}>
          {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {sent ? t("verify.resend") : t("verify.send")}
        </Button>

        {canSwitchProfile && (
          <button
            type="button"
            onClick={() => switchMode("vendedor")}
            className="mt-4 w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("verify.backToFarmer")}
          </button>
        )}
      </div>
    </div>
  );
};

export default ClientEmailVerificationGate;
