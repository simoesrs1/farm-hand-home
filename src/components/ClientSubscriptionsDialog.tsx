import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Repeat, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatEuro } from "@/lib/format";
import { billingLabel, CANCEL_CUTOFF_HOURS, deliveryLabel, type Subscription } from "@/lib/subscriptions";

/**
 * "As minhas subscrições" em As minhas encomendas: as subscrições do cliente,
 * com a próxima cobrança e o cancelamento (a qualquer momento).
 */
const ClientSubscriptionsDialog = ({ onChanged }: { onChanged?: () => void }) => {
  const { t } = useTranslation(["offerings", "common"]);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [farms, setFarms] = useState<Record<string, string>>({});
  const [cancelling, setCancelling] = useState<Subscription | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    const list = data ?? [];
    setSubs(list);
    const ids = [...new Set(list.map((s) => s.farmer_id))];
    if (ids.length > 0) {
      const { data: rows } = await supabase.from("public_farmer_profiles").select("id, company_name").in("id", ids);
      setFarms(Object.fromEntries((rows ?? []).map((r) => [r.id ?? "", r.company_name ?? ""])));
    }
  }, [user]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const cancel = async () => {
    if (!cancelling) return;
    const { data, error } = await supabase.rpc("cancel_subscription", { p_subscription_id: cancelling.id });
    setCancelling(null);
    if (error) {
      toast({ title: t("subscriptions.cancelFailed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("subscriptions.cancelled"), description: t("subscriptions.cancelledText", { count: Number(data ?? 0) }) });
    load();
    onChanged?.();
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Repeat className="h-4 w-4" /> {t("subscriptions.mine")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("subscriptions.mine")}</DialogTitle>
            <DialogDescription>{t("subscriptions.mineText", { hours: CANCEL_CUTOFF_HOURS })}</DialogDescription>
          </DialogHeader>
          {subs === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : subs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("subscriptions.noneMine")}</p>
          ) : (
            <ul className="space-y-3">
              {subs.map((s) => (
                <li key={s.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{s.title}</p>
                      <Link to={`/agricultor/${s.farmer_id}`} className="text-xs text-primary hover:underline">
                        {farms[s.farmer_id] || t("subscriptions.farmFallback")}
                      </Link>
                    </div>
                    <Badge variant={s.status === "active" ? "default" : "secondary"}>
                      {s.status === "active" ? t("subscriptions.statusActive") : t("subscriptions.statusCancelled")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatEuro(Number(s.price))} {billingLabel(s.billing_interval)} · {deliveryLabel(s.delivery_interval)}
                  </p>
                  {s.status === "active" ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {t("subscriptions.nextBilling", { date: formatDate(s.next_billing_at) })}
                      </p>
                      <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => setCancelling(s)}>
                        <XCircle className="h-4 w-4" /> {t("subscriptions.cancel")}
                      </Button>
                    </div>
                  ) : (
                    s.cancelled_at && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("subscriptions.cancelledOn", { date: formatDate(s.cancelled_at) })}
                      </p>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelling !== null} onOpenChange={(o) => !o && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriptions.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("subscriptions.cancelConfirmClient", { hours: CANCEL_CUTOFF_HOURS })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.back")}</AlertDialogCancel>
            <AlertDialogAction onClick={cancel}>{t("subscriptions.cancel")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientSubscriptionsDialog;
