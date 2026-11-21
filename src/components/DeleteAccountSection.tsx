import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Loader2, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Blockers {
  client_orders: number;
  farmer_orders: number;
  farmer_subscriptions: number;
}

/**
 * "Eliminar conta" nas Definições. Primeiro verifica o que está por concluir
 * (encomendas, reservas, subscrições de clientes da quinta); se não houver nada,
 * pede o email como confirmação e chama a Edge Function delete-account.
 */
const DeleteAccountSection = () => {
  const { t } = useTranslation(["account", "common"]);
  const { user } = useAuth();
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [blockers, setBlockers] = useState<Blockers | null>(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const pendingTotal = blockers ? blockers.client_orders + blockers.farmer_orders + blockers.farmer_subscriptions : 0;
  const matches = !!user?.email && typed.trim().toLowerCase() === user.email.toLowerCase();

  const start = async () => {
    setChecking(true);
    const { data, error } = await supabase.rpc("my_account_deletion_blockers");
    setChecking(false);
    if (error) {
      toast({ title: t("settings.delete.failed"), description: error.message, variant: "destructive" });
      return;
    }
    const b = (data ?? {}) as Partial<Blockers>;
    setBlockers({
      client_orders: Number(b.client_orders ?? 0),
      farmer_orders: Number(b.farmer_orders ?? 0),
      farmer_subscriptions: Number(b.farmer_subscriptions ?? 0),
    });
    setTyped("");
    setOpen(true);
  };

  const confirm = async () => {
    if (!matches) return;
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account", { body: { confirm_email: typed.trim() } });
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          if (body?.error) msg = body.error;
        } catch {
          // mantém a mensagem genérica
        }
      }
      setDeleting(false);
      toast({ title: t("settings.delete.failed"), description: msg, variant: "destructive" });
      return;
    }
    clearCart();
    // A conta já está bloqueada: terminar a sessão local pode falhar no servidor.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    setDeleting(false);
    setOpen(false);
    toast({ title: t("settings.delete.done"), description: t("settings.delete.doneText") });
    navigate("/", { replace: true });
  };

  return (
    <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="mb-3 flex items-center gap-2 text-destructive">
        <UserX className="h-5 w-5" />
        <h2 className="font-display text-base font-semibold">{t("settings.delete.title")}</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("settings.delete.text")}</p>
      <Button variant="destructive" onClick={start} disabled={checking} className="gap-2">
        {checking && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("settings.delete.button")}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.delete.title")}</DialogTitle>
            <DialogDescription>
              {pendingTotal > 0 ? t("settings.delete.blockedText") : t("settings.delete.confirmText")}
            </DialogDescription>
          </DialogHeader>

          {pendingTotal > 0 && blockers ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
              {blockers.client_orders > 0 && <li>{t("settings.delete.clientOrders", { count: blockers.client_orders })}</li>}
              {blockers.farmer_orders > 0 && <li>{t("settings.delete.farmerOrders", { count: blockers.farmer_orders })}</li>}
              {blockers.farmer_subscriptions > 0 && (
                <li>{t("settings.delete.farmerSubscriptions", { count: blockers.farmer_subscriptions })}</li>
              )}
            </ul>
          ) : (
            <div className="space-y-3">
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>{t("settings.delete.whatDeleted")}</li>
                <li>{t("settings.delete.whatKept")}</li>
                <li>{t("settings.delete.whatReviews")}</li>
                <li>{t("settings.delete.whatEmail")}</li>
              </ul>
              <div className="space-y-1.5">
                <Label htmlFor="delete-confirm-email">{t("settings.delete.typeEmail", { email: user?.email ?? "" })}</Label>
                <Input
                  id="delete-confirm-email"
                  type="email"
                  autoComplete="off"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              {pendingTotal > 0 ? t("common:actions.close") : t("common:actions.cancel")}
            </Button>
            {pendingTotal === 0 && (
              <Button variant="destructive" onClick={confirm} disabled={!matches || deleting} className="gap-2">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("settings.delete.confirm")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeleteAccountSection;
