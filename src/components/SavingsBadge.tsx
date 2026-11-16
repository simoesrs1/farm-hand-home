import { TrendingDown, Tag } from "lucide-react";
import { type MarketPrice } from "@/hooks/useMarketPrices";
import { formatEuro } from "@/lib/format";

interface SavingsBadgeProps {
  /** Preço final pago pelo cliente (já com desconto do agricultor). */
  price: number;
  /** Preço antes do desconto do agricultor, se existir. */
  originalPrice?: number;
  unit: string;
  market?: MarketPrice;
}


/**
 * Mostra a poupança do cliente: desconto do agricultor e comparação
 * com o preço médio das grandes superfícies (recolhido diariamente).
 */
const SavingsBadge = ({ price, originalPrice, unit, market }: SavingsBadgeProps) => {
  const hasDiscount = !!originalPrice && originalPrice > price;
  const discountSaving = hasDiscount ? originalPrice! - price : 0;
  const discountPercent = hasDiscount ? Math.round((discountSaving / originalPrice!) * 100) : 0;

  const marketSaving = market && market.avgPrice > price ? market.avgPrice - price : 0;
  const marketPercent = marketSaving ? Math.round((marketSaving / market!.avgPrice) * 100) : 0;

  if (!hasDiscount && !marketSaving) return null;

  return (
    <div className="mt-2 space-y-1">
      {hasDiscount && (
        <div className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
          <Tag className="h-3 w-3" />
          Poupa {formatEuro(discountSaving)} ({discountPercent}%)
          <span className="font-normal text-muted-foreground line-through">{formatEuro(originalPrice!)}</span>
        </div>
      )}
      {marketSaving > 0 && (
        <div
          className="flex items-start gap-1 text-xs text-muted-foreground"
          title={`Preço médio de ${formatEuro(market!.avgPrice)}/${market!.unit} em ${market!.sampleSize} referências de supermercado, atualizado a ${new Date(market!.collectedAt).toLocaleDateString("pt-PT")}`}
        >
          <TrendingDown className="mt-0.5 h-3 w-3 shrink-0 text-success" />
          <span>
            <span className="font-semibold text-success">
              −{formatEuro(marketSaving)} ({marketPercent}%)
            </span>{" "}
            face ao supermercado ({formatEuro(market!.avgPrice)}/{unit})
          </span>
        </div>
      )}
    </div>
  );
};

export default SavingsBadge;
