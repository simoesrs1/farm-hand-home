import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface DeliveryFeeFieldsProps {
  fee: string;
  onFeeChange: (value: string) => void;
  freeThreshold: string;
  onFreeThresholdChange: (value: string) => void;
}

/** Preço da entrega ao domicílio e limite da entrega grátis (formulário de produto). */
const DeliveryFeeFields = ({ fee, onFeeChange, freeThreshold, onFreeThresholdChange }: DeliveryFeeFieldsProps) => {
  const { t } = useTranslation("farmer");
  return (
  <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
    <div className="space-y-2">
      <Label htmlFor="delivery-fee">{t("deliveryFee.fee")}</Label>
      <Input
        id="delivery-fee"
        inputMode="decimal"
        value={fee}
        onChange={(e) => onFeeChange(e.target.value)}
        placeholder="0,00"
      />
      <p className="text-xs text-muted-foreground">
        {t("deliveryFee.feeHint")}
      </p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="free-delivery">{t("deliveryFee.free")}</Label>
      <Input
        id="free-delivery"
        inputMode="decimal"
        value={freeThreshold}
        onChange={(e) => onFreeThresholdChange(e.target.value)}
        placeholder={t("deliveryFee.noLimit")}
      />
      <p className="text-xs text-muted-foreground">
        {t("deliveryFee.freeHint")}
      </p>
    </div>
  </div>
);
};

export default DeliveryFeeFields;
