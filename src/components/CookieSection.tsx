import { Trans, useTranslation } from "react-i18next";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/contexts/ConsentContext";
import { CONSENT_CATEGORIES } from "@/lib/consent";

// Dados guardados no navegador. Os textos de cada linha estão em
// legal:cookies.items.<chave> (tipo, categoria, finalidade, duração).
const STORAGE_ITEMS = [
  { key: "auth", name: "sb-…-auth-token" },
  { key: "consent", name: "fc_consent" },
  { key: "sid", name: "fc_sid" },
  { key: "cart", name: "farmconnect_cart" },
  { key: "pickupSlot", name: "farmconnect_pickup_slot" },
  { key: "fulfillment", name: "farmconnect_fulfillment" },
  { key: "deliveryRoute", name: "farmconnect_delivery_route" },
  { key: "searchLocation", name: "farmconnect_search_location" },
  { key: "prev", name: "<chave>::prev" },
  { key: "pendingProfile", name: "farmconnect:pending_profile_type" },
  { key: "lang", name: "valorrural_lang" },
  { key: "animations", name: "valorrural:animacoes-pausadas" },
  { key: "fonts", name: "Google Fonts" },
  { key: "google", name: "Google (NID…)" },
] as const;

/** Secção "Cookies e armazenamento local" da Política de Privacidade (todos os idiomas). */
const CookieSection = () => {
  const { t } = useTranslation("legal");
  const { openPreferences, choices, decided } = useConsent();
  return (
    <>
      <p>{t("cookies.p1")}</p>
      <p>
        <Trans t={t} i18nKey="cookies.p2" components={{ b: <strong /> }} />
      </p>

      <ul>
        {CONSENT_CATEGORIES.map((c) => (
          <li key={c.id}>
            <strong>{c.title}</strong> — {c.description}
          </li>
        ))}
      </ul>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-foreground">
              <th className="px-3 py-2 font-semibold">{t("cookies.table.name")}</th>
              <th className="px-3 py-2 font-semibold">{t("cookies.table.type")}</th>
              <th className="px-3 py-2 font-semibold">{t("cookies.table.category")}</th>
              <th className="px-3 py-2 font-semibold">{t("cookies.table.purpose")}</th>
              <th className="px-3 py-2 font-semibold">{t("cookies.table.duration")}</th>
            </tr>
          </thead>
          <tbody>
            {STORAGE_ITEMS.map((item) => (
              <tr key={item.key} className="border-b border-border align-top">
                <td className="px-3 py-2 font-mono text-[11px] text-foreground">{item.name}</td>
                <td className="px-3 py-2">{t(`cookies.items.${item.key}.type`)}</td>
                <td className="px-3 py-2">{t(`cookies.items.${item.key}.category`)}</td>
                <td className="px-3 py-2">{t(`cookies.items.${item.key}.purpose`)}</td>
                <td className="px-3 py-2">{t(`cookies.items.${item.key}.duration`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        <Trans
          t={t}
          i18nKey="cookies.google"
          components={{
            link: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" />,
          }}
        />
      </p>

      <p>{t("cookies.location")}</p>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          {decided
            ? t("cookies.state", {
                preferences: choices.preferences ? t("cookies.on") : t("cookies.off"),
                maps: choices.maps ? t("cookies.on") : t("cookies.off"),
              })
            : t("cookies.noChoice")}
        </p>
        <Button onClick={openPreferences} className="gap-2 sm:shrink-0">
          <Cookie className="h-4 w-4" />
          {t("cookies.manage")}
        </Button>
      </div>
    </>
  );
};

export default CookieSection;
