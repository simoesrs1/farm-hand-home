import { useEffect, useState } from "react";
import { Loader2, Save, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import OfferingsPicker from "@/components/OfferingsPicker";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OFFERINGS_CHANGED_EVENT, type Offerings } from "@/lib/farmer-offerings";
import { useTranslation } from "react-i18next";

/**
 * "O que disponibiliza" em Informações da exploração. Grava logo, sem pedido de
 * alteração; as regras para desligar uma opção são verificadas na base de dados.
 */
const FarmerOfferingsSection = ({ farmerId }: { farmerId: string }) => {
  const { t } = useTranslation(["farmer", "common"]);
  const [saved, setSaved] = useState<Offerings | null>(null);
  const [value, setValue] = useState<Offerings>({ products: true, experiences: false, stays: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("farmer_details")
      .select("offers_products, offers_experiences, offers_stays")
      .eq("id", farmerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const v = { products: data.offers_products, experiences: data.offers_experiences, stays: data.offers_stays };
        setSaved(v);
        setValue(v);
      });
  }, [farmerId]);

  const changed = !!saved && (Object.keys(value) as (keyof Offerings)[]).some((k) => value[k] !== saved[k]);

  const save = async () => {
    if (!value.products && !value.experiences && !value.stays) {
      toast({ title: t("offeringsSection.chooseOne"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("farmer_details")
      .update({ offers_products: value.products, offers_experiences: value.experiences, offers_stays: value.stays })
      .eq("id", farmerId);
    setSaving(false);
    if (error) {
      toast({ title: t("offeringsSection.failed"), description: error.message, variant: "destructive" });
      return;
    }
    setSaved(value);
    window.dispatchEvent(new Event(OFFERINGS_CHANGED_EVENT));
    toast({ title: t("offeringsSection.updated"), description: t("offeringsSection.updatedText") });
  };

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-6">
      <div className="mb-1 flex items-center gap-2 text-foreground">
        <Store className="h-5 w-5 text-primary" />
        <h2 className="font-display text-base font-semibold">{t("offeringsSection.title")}</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {t("offeringsSection.text")}
      </p>
      <OfferingsPicker value={value} onChange={setValue} disabled={!saved || saving} />
      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={!changed || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("offeringsSection.save")}
        </Button>
      </div>
    </section>
  );
};

export default FarmerOfferingsSection;
