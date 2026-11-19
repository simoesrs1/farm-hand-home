import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { parseEuro } from "@/lib/delivery-defaults";
import { useTranslation } from "react-i18next";

/** Brinde em edição: preço vazio ou 0 = grátis. */
export type GiftDraft = { product_id: string; extra_price: string };
type ProductOption = { id: string; name: string; stock_quantity: number | null };

interface GiftListEditorProps {
  farmerId: string;
  gifts: GiftDraft[];
  onGiftsChange: (gifts: GiftDraft[]) => void;
  keepWithoutGift: boolean;
  onKeepWithoutGiftChange: (value: boolean) => void;
  /** Experiência ou alojamento, para os textos. */
  kind: "experience" | "stay";
}

/**
 * Brindes de uma experiência ou alojamento: produtos da quinta, por ordem. Os
 * grátis seguem a ordem da lista (o cliente recebe o primeiro com stock); os
 * pagos são extras opcionais.
 */
const GiftListEditor = ({ farmerId, gifts, onGiftsChange, keepWithoutGift, onKeepWithoutGiftChange, kind }: GiftListEditorProps) => {
  const { t } = useTranslation(["offerings", "common"]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [toAdd, setToAdd] = useState("");

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, stock_quantity")
      .eq("farmer_id", farmerId)
      .eq("active", true)
      .order("name")
      .then(({ data }) => setProducts(data ?? []));
  }, [farmerId]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const available = products.filter((p) => !gifts.some((g) => g.product_id === p.id));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= gifts.length) return;
    const next = [...gifts];
    [next[i], next[j]] = [next[j], next[i]];
    onGiftsChange(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t("gifts.intro")}
      </p>
      {gifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("gifts.none")}</p>
      ) : (
        <ul className="space-y-2">
          {gifts.map((g, i) => {
            const p = productById.get(g.product_id);
            const free = !g.extra_price.trim() || parseEuro(g.extra_price) === 0;
            return (
              <li key={g.product_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p?.name ?? t("gifts.unavailable")}</p>
                  <p className="text-xs text-muted-foreground">{p ? t("gifts.inStock", { count: p.stock_quantity ?? 0 }) : t("gifts.inactive")}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${free ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {free ? t("gifts.free") : t("gifts.paidExtra")}
                </span>
                <Input
                  inputMode="decimal"
                  value={g.extra_price}
                  onChange={(e) => onGiftsChange(gifts.map((x, j) => (j === i ? { ...x, extra_price: e.target.value } : x)))}
                  placeholder="0,00"
                  className="h-8 w-24"
                  aria-label={t("gifts.priceAria")}
                />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("gifts.up")}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(i, 1)} disabled={i === gifts.length - 1} aria-label={t("gifts.down")}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onGiftsChange(gifts.filter((_, j) => j !== i))} aria-label={t("gifts.remove")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={toAdd}
          onChange={(e) => setToAdd(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          aria-label={t("gifts.productAria")}
        >
          <option value="">{t("gifts.chooseProduct")}</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({t("gifts.inStock", { count: p.stock_quantity ?? 0 })})
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!toAdd}
          onClick={() => {
            onGiftsChange([...gifts, { product_id: toAdd, extra_price: "" }]);
            setToAdd("");
          }}
        >
          <Plus className="h-4 w-4" /> {t("gifts.add")}
        </Button>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
        <div>
          <Label htmlFor="keep-without-gift" className="text-sm font-medium">{t("gifts.keep")}</Label>
          <p className="text-xs text-muted-foreground">
            {t(kind === "stay" ? "gifts.keepStay" : "gifts.keepExperience")}
          </p>
        </div>
        <Switch id="keep-without-gift" checked={keepWithoutGift} onCheckedChange={onKeepWithoutGiftChange} />
      </div>
    </div>
  );
};

export default GiftListEditor;
