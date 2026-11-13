import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { parseEuro } from "@/lib/delivery-defaults";

/** Brinde em edição: preço vazio ou 0 = grátis. */
export type GiftDraft = { product_id: string; extra_price: string };
type ProductOption = { id: string; name: string; stock_quantity: number | null };

interface GiftListEditorProps {
  farmerId: string;
  gifts: GiftDraft[];
  onGiftsChange: (gifts: GiftDraft[]) => void;
  keepWithoutGift: boolean;
  onKeepWithoutGiftChange: (value: boolean) => void;
  /** "A experiência" ou "O alojamento", para os textos. */
  subject: string;
}

/**
 * Brindes de uma experiência ou alojamento: produtos da quinta, por ordem. Os
 * grátis seguem a ordem da lista (o cliente recebe o primeiro com stock); os
 * pagos são extras opcionais.
 */
const GiftListEditor = ({ farmerId, gifts, onGiftsChange, keepWithoutGift, onKeepWithoutGiftChange, subject }: GiftListEditorProps) => {
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
        Escolha produtos da sua quinta. Os brindes grátis (preço 0) seguem a ordem da lista: o cliente recebe o
        primeiro com stock. Os brindes com preço são extras que o cliente pode juntar. Todos contam com o stock da loja.
      </p>
      {gifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda sem brindes. Adicione pelo menos um brinde grátis.</p>
      ) : (
        <ul className="space-y-2">
          {gifts.map((g, i) => {
            const p = productById.get(g.product_id);
            const free = !g.extra_price.trim() || parseEuro(g.extra_price) === 0;
            return (
              <li key={g.product_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p?.name ?? "Produto indisponível"}</p>
                  <p className="text-xs text-muted-foreground">{p ? `${p.stock_quantity ?? 0} em stock` : "Já não está ativo"}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${free ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {free ? "Grátis" : "Extra pago"}
                </span>
                <Input
                  inputMode="decimal"
                  value={g.extra_price}
                  onChange={(e) => onGiftsChange(gifts.map((x, j) => (j === i ? { ...x, extra_price: e.target.value } : x)))}
                  placeholder="0,00"
                  className="h-8 w-24"
                  aria-label="Preço do brinde (0 = grátis)"
                />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(i, 1)} disabled={i === gifts.length - 1} aria-label="Descer">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onGiftsChange(gifts.filter((_, j) => j !== i))} aria-label="Remover brinde">
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
          aria-label="Produto para brinde"
        >
          <option value="">Escolher produto...</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.stock_quantity ?? 0} em stock)
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
          <Plus className="h-4 w-4" /> Adicionar brinde
        </Button>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
        <div>
          <Label htmlFor="keep-without-gift" className="text-sm font-medium">Manter sem brinde</Label>
          <p className="text-xs text-muted-foreground">
            Se todos os brindes grátis esgotarem, {subject.toLowerCase()} continua disponível, sem brinde e sem o
            mencionar. Desligado, deixa de aceitar reservas até repor o stock.
          </p>
        </div>
        <Switch id="keep-without-gift" checked={keepWithoutGift} onCheckedChange={onKeepWithoutGiftChange} />
      </div>
    </div>
  );
};

export default GiftListEditor;
