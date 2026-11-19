import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConsent } from "@/contexts/ConsentContext";
import { CONSENT_CATEGORIES, ConsentChoices } from "@/lib/consent";
import { Trans, useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/format";

/**
 * Banner de consentimento (não bloqueante) + painel de preferências.
 * "Rejeitar" e "Aceitar" têm o mesmo peso visual, como exigem as orientações
 * do CEPD/CNPD; nada além do estritamente necessário fica ativo por defeito.
 */
const CookieConsent = () => {
  const {
    decided,
    record,
    choices,
    acceptAll,
    rejectAll,
    save,
    preferencesOpen,
    openPreferences,
    closePreferences,
  } = useConsent();
  const [draft, setDraft] = useState<ConsentChoices>(choices);
  const { t } = useTranslation("legal");

  useEffect(() => {
    if (preferencesOpen) setDraft(choices);
  }, [preferencesOpen, choices]);

  return (
    <>
      {!decided && !preferencesOpen && (
        <div
          role="region"
          aria-label={t("consent.aria")}
          className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
        >
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex flex-1 gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:flex">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">
                    {t("consent.title")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("consent.text")}{" "}
                    <Link to="/privacidade#cookies" className="font-medium text-primary underline-offset-4 hover:underline">
                      {t("consent.learnMore")}
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
                <Button variant="ghost" onClick={openPreferences}>
                  {t("consent.customize")}
                </Button>
                <Button onClick={rejectAll}>{t("consent.reject")}</Button>
                <Button onClick={acceptAll}>{t("consent.acceptAll")}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={preferencesOpen} onOpenChange={(open) => !open && closePreferences()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t("consent.preferencesTitle")}
            </DialogTitle>
            <DialogDescription>
              <Trans
                t={t}
                i18nKey="consent.preferencesText"
                components={{
                  link: (
                    <Link
                      to="/privacidade#cookies"
                      onClick={closePreferences}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    />
                  ),
                }}
              />
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {CONSENT_CATEGORIES.map((cat) => {
              const id = `consent-${cat.id}`;
              return (
                <div key={cat.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor={id} className="text-sm font-semibold text-foreground">
                      {cat.title}
                    </label>
                    {cat.required ? (
                      <span className="text-xs font-medium text-muted-foreground">{t("consent.alwaysOn")}</span>
                    ) : (
                      <Switch
                        id={id}
                        checked={draft[cat.id]}
                        onCheckedChange={(checked) => setDraft((d) => ({ ...d, [cat.id]: checked }))}
                      />
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {cat.description}
                  </p>
                </div>
              );
            })}
          </div>

          {record && (
            <p className="text-xs text-muted-foreground">
              {t("consent.lastDecision", { date: formatDateTime(record.decidedAt, { dateStyle: "short", timeStyle: "short" }) })}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={rejectAll}>
              {t("consent.rejectAll")}
            </Button>
            <Button variant="outline" onClick={() => save(draft)}>
              {t("consent.save")}
            </Button>
            <Button onClick={acceptAll}>{t("consent.acceptAll")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;
