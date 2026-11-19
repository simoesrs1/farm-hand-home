import { TrendingDown, Tag } from "lucide-react";
import { type MarketPrice } from "@/hooks/useMarketPrices";
import { formatDate, formatEuro } from "@/lib/format";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("catalog");
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
          {t("savings.save", { amount: formatEuro(discountSaving), percent: discountPercent })}
          <span className="font-normal text-muted-foreground line-through">{formatEuro(originalPrice!)}</span>
        </div>
      )}
      {marketSaving > 0 && (
        <div
          className="flex items-start gap-1 text-xs text-muted-foreground"
          title={t("savings.marketTitle", {
            price: formatEuro(market!.avgPrice),
            unit: market!.unit,
            count: market!.sampleSize,
            date: formatDate(market!.collectedAt),
          })}
        >
          <TrendingDown className="mt-0.5 h-3 w-3 shrink-0 text-success" />
          <span>
            <span className="font-semibold text-success">
              −{formatEuro(marketSaving)} ({marketPercent}%)
            </span>{" "}
            {t("savings.vsMarket", { price: formatEuro(market!.avgPrice), unit })}
          </span>
        </div>
      )}
    </div>
  );
};

export default SavingsBadge;
