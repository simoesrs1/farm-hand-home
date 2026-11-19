import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import DeliveryFeeFields from "@/components/DeliveryFeeFields";
import { supabase } from "@/integrations/supabase/client";
import { DELIVERY_MODE_OPTIONS, hasHomeDelivery, type DeliveryModeValue } from "@/lib/delivery-defaults";
import { farmerDelivers } from "@/lib/fulfillment";
import { Trans, useTranslation } from "react-i18next";

interface DeliveryModeFieldsProps {
  farmerId: string | null;
  mode: DeliveryModeValue;
  onModeChange: (value: DeliveryModeValue) => void;
  tracking: boolean;
  onTrackingChange: (value: boolean) => void;
  fee: string;
  onFeeChange: (value: string) => void;
  freeThreshold: string;
  onFreeThresholdChange: (value: string) => void;
  /** Prazo mínimo de preparação da entrega, em dias (products.shipping_days). */
  preparationDays: string;
  onPreparationDaysChange: (value: string) => void;
}

/**
 * Entrega de um produto (formulários novo e editar): um só controlo com
 * levantamento, entrega ao domicílio pelo agricultor ou ambos. Acompanhamento,
 * preço e prazo de preparação só aparecem com entrega.
 */
const DeliveryModeFields = ({
  farmerId,
  mode,
  onModeChange,
  tracking,
  onTrackingChange,
  fee,
  onFeeChange,
  freeThreshold,
  onFreeThresholdChange,
  preparationDays,
  onPreparationDaysChange,
}: DeliveryModeFieldsProps) => {
  const { t } = useTranslation("farmer");
  // Sem raio e localização da quinta, o cliente não consegue escolher a entrega.
  const [deliveryConfigured, setDeliveryConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    if (!farmerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("farmer_details")
        .select("delivery_radius_km, pickup_lat, pickup_lng")
        .eq("id", farmerId)
        .maybeSingle();
      if (cancelled) return;
      setDeliveryConfigured(
        farmerDelivers(
          data?.delivery_radius_km != null ? Number(data.delivery_radius_km) : null,
          data?.pickup_lat != null && data?.pickup_lng != null
            ? { lat: Number(data.pickup_lat), lng: Number(data.pickup_lng) }
            : null,
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [farmerId]);

  const withDelivery = hasHomeDelivery({ delivery_mode: mode });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("deliveryMode.label")}</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {DELIVERY_MODE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onModeChange(o.value)}
              aria-pressed={mode === o.value}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                mode === o.value ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-secondary"
              }`}
            >
              <span className="block font-medium">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {withDelivery && deliveryConfigured === false && (
        <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <p>
            <Trans
              t={t}
              i18nKey="deliveryMode.notConfigured"
              components={{
                link: <Link to="/agricultor/disponibilidade" className="font-medium text-primary underline-offset-2 hover:underline" />,
              }}
            />
          </p>
        </div>
      )}

      {withDelivery && (
        <>
          <div className="space-y-2">
            <Label htmlFor="preparation-days">{t("deliveryMode.prepDays")}</Label>
            <Input
              id="preparation-days"
              type="number"
              min="0"
              step="1"
              value={preparationDays}
              onChange={(e) => onPreparationDaysChange(e.target.value)}
              placeholder="0"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              {t("deliveryMode.prepDaysHint")}
            </p>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="delivery-tracking" className="text-sm font-medium">
                {t("deliveryMode.tracking")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("deliveryMode.trackingHint")}
              </p>
            </div>
            <Switch id="delivery-tracking" checked={tracking} onCheckedChange={onTrackingChange} />
          </div>
          <DeliveryFeeFields
            fee={fee}
            onFeeChange={onFeeChange}
            freeThreshold={freeThreshold}
            onFreeThresholdChange={onFreeThresholdChange}
          />
        </>
      )}
    </div>
  );
};

export default DeliveryModeFields;
