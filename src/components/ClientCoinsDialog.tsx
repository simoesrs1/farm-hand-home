import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatEuro, formatNumber } from "@/lib/format";
import { COIN_RULES, coinsToEuroHint, parseCoinsSummary, type CoinMovementKind, type CoinsSummary } from "@/lib/coins";

/** Endereço que abre o diálogo diretamente (ligação das notificações e do menu). */
export const COINS_QUERY_PARAM = "coins";

const MOVEMENT_KEYS = {
  earn: "coins.movement.earn",
  expire: "coins.movement.expire",
  reverse: "coins.movement.reverse",
  redeem: "coins.movement.redeem",
  return: "coins.movement.return",
} as const satisfies Record<CoinMovementKind, string>;

const SOURCE_KEYS = {
  order: "coins.source.order",
  review: "coins.source.review",
  referral: "coins.source.referral",
  referral_welcome: "coins.source.referral_welcome",
  adjustment: "coins.source.adjustment",
} as const;

/**
 * "As minhas coins" em As minhas encomendas: saldo, pendentes, coins a
 * expirar, histórico e como se ganham. Abre também com ?coins=1.
 */
const ClientCoinsDialog = () => {
  const { t } = useTranslation(["account", "common"]);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const openFromUrl = searchParams.get(COINS_QUERY_PARAM) === "1";
  const [open, setOpen] = useState(openFromUrl);
  const [summary, setSummary] = useState<CoinsSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (openFromUrl) setOpen(true);
  }, [openFromUrl]);

  const load = useCallback(async () => {
    if (!user) return;
    setFailed(false);
    const { data, error } = await supabase.rpc("my_coins_summary");
    if (error) {
      setFailed(true);
      return;
    }
    setSummary(parseCoinsSummary(data));
  }, [user]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next && openFromUrl) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete(COINS_QUERY_PARAM);
          return p;
        },
        { replace: true },
      );
    }
  };

  const sourceLabel = (source: string | null) =>
    source && source in SOURCE_KEYS ? t(SOURCE_KEYS[source as keyof typeof SOURCE_KEYS]) : "";

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => changeOpen(true)}>
        <Coins className="h-4 w-4" /> {t("coins.mine")}
      </Button>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("coins.mine")}</DialogTitle>
            <DialogDescription>{t("coins.intro")}</DialogDescription>
          </DialogHeader>

          {failed ? (
            <p className="text-sm text-destructive">{t("coins.loadFailed")}</p>
          ) : !summary ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Saldo */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("coins.available")}</p>
                <p className="mt-1 font-display text-3xl font-semibold text-foreground">
                  {t("coins.count", { count: summary.available, formatted: formatNumber(summary.available) })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("coins.euroHint", { value: formatEuro(coinsToEuroHint(summary.available)) })}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">{t("coins.rewardsSoon")}</p>
              </div>

              {/* Pendentes */}
              {summary.pending_lots.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {t("coins.pendingTitle", { count: summary.pending, formatted: formatNumber(summary.pending) })}
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {summary.pending_lots.map((lot, i) => (
                      <li key={i}>
                        {t("coins.pendingLot", {
                          count: lot.coins,
                          formatted: formatNumber(lot.coins),
                          date: formatDate(lot.available_at),
                        })}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* A expirar */}
              {summary.expiring_lots.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-destructive">{t("coins.expiringTitle")}</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {summary.expiring_lots.map((lot, i) => (
                      <li key={i}>
                        {t("coins.expiringLot", {
                          count: lot.coins,
                          formatted: formatNumber(lot.coins),
                          date: formatDate(lot.expires_at),
                        })}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Como se ganham */}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t("coins.howTitle")}</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>{t("coins.howOrders", { n: COIN_RULES.per_euro })}</li>
                  <li>{t("coins.howSubscriptions", { n: COIN_RULES.subscription_bonus })}</li>
                  <li>{t("coins.howBookings", { n: COIN_RULES.booking_bonus })}</li>
                  <li>{t("coins.howReviews", { n: COIN_RULES.review })}</li>
                  <li>
                    {t("coins.howTiming", { days: COIN_RULES.pending_days, months: COIN_RULES.validity_months })}
                  </li>
                </ul>
              </section>

              {/* Histórico */}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t("coins.historyTitle")}</h3>
                {summary.movements.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    {t("coins.historyEmpty")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {summary.movements.map((m, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="text-foreground">
                            {t(MOVEMENT_KEYS[m.kind] ?? MOVEMENT_KEYS.earn)}
                            {sourceLabel(m.source_type) && (
                              <span className="text-muted-foreground"> · {sourceLabel(m.source_type)}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(m.created_at)}</p>
                        </div>
                        <span className={`shrink-0 font-medium ${m.coins >= 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {m.coins >= 0 ? "+" : "−"}
                          {formatNumber(Math.abs(m.coins))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p className="text-xs text-muted-foreground">{t("coins.legal")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientCoinsDialog;
