import { useEffect, useState } from "react";
import { Loader2, Save, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import OfferingsPicker from "@/components/OfferingsPicker";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OFFERINGS_CHANGED_EVENT, type Offerings } from "@/lib/farmer-offerings";

/**
 * "O que disponibiliza" em Informações da exploração. Grava logo, sem pedido de
 * alteração; as regras para desligar uma opção são verificadas na base de dados.
 */
const FarmerOfferingsSection = ({ farmerId }: { farmerId: string }) => {
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
      toast({ title: "Escolha pelo menos uma opção", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("farmer_details")
      .update({ offers_products: value.products, offers_experiences: value.experiences, offers_stays: value.stays })
      .eq("id", farmerId);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível alterar", description: error.message, variant: "destructive" });
      return;
    }
    setSaved(value);
    window.dispatchEvent(new Event(OFFERINGS_CHANGED_EVENT));
    toast({ title: "Opções atualizadas", description: "O menu já mostra as opções escolhidas." });
  };

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-6">
      <div className="mb-1 flex items-center gap-2 text-foreground">
        <Store className="h-5 w-5 text-primary" />
        <h2 className="font-display text-base font-semibold">O que disponibiliza</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Pode ativar ou desativar cada opção quando quiser. Para desativar, termine primeiro o stock dos produtos à venda
        ou suspenda as experiências e o alojamento. As reservas já feitas mantêm-se e têm de ser cumpridas.
      </p>
      <OfferingsPicker value={value} onChange={setValue} disabled={!saved || saving} />
      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={!changed || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar opções
        </Button>
      </div>
    </section>
  );
};

export default FarmerOfferingsSection;
