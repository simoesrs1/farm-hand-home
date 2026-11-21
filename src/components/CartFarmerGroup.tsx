import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MapPin, Minus, Navigation, Plus, Store, Trash2, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TranslatedText from "@/components/TranslatedText";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useStock } from "@/contexts/StockContext";
import { FULFILLMENT_LABELS, type Fulfillment } from "@/lib/fulfillment";
import { formatSlotDate, formatSlotTime } from "@/lib/pickup-hours";
import { formatEuro } from "@/lib/format";
import { directionsUrl } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { FarmerSettings, GroupChoice, GroupState } from "@/lib/cart-groups";

interface CartFarmerGroupProps {
  farmer: string;
  farmerId: string;
  items: CartItem[];
  state: GroupState;
  choice: GroupChoice;
  settings: FarmerSettings | undefined;
  /** Assinala o bloco quando falta preencher algo ao tentar pagar. */
  highlighted: boolean;
  onChange: (patch: Partial<GroupChoice>) => void;
  onOpenMap: () => void;
}

/**
 * Bloco de um agricultor no carrinho: os artigos e, logo abaixo, como o
 * cliente os quer receber (levantar ou em casa), o horário e a morada. A
 * escolha vale para todos os artigos deste agricultor, que formam uma encomenda.
 */
const CartFarmerGroup = forwardRef<HTMLDivElement, CartFarmerGroupProps>(
  ({ farmer, farmerId, items, state, choice, settings, highlighted, onChange, onOpenMap }, ref) => {
    const { updateQuantity, removeItem } = useCart();
    const { getAvailable } = useStock();
    const { t } = useTranslation(["cart", "common", "catalog"]);
    const { fulfillment, isDelivery } = state;
    const note = isDelivery ? settings?.deliveryNote : settings?.pickupNote;

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-2xl border bg-card transition-shadow",
          highlighted ? "border-destructive ring-2 ring-destructive/30" : "border-border",
        )}
      >
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("producer")}</p>
          <Link
            to={`/agricultor/${farmerId}`}
            className="font-display font-semibold text-foreground hover:text-primary"
          >
            {farmer}
          </Link>
        </div>

        <ul className="divide-y divide-border">
          {items.map((item) => {
            const available = getAvailable(item.id);
            const canIncrease = item.quantity < available;
            return (
              <li key={item.id} className="flex gap-4 p-4">
                <img src={item.image} alt={item.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        <TranslatedText type="product" id={item.id} field="name" text={item.name} />
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatEuro(item.price)} / {item.unit}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("catalog:product.inStock", { count: available })}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t("common:actions.remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-1 rounded-lg border border-border">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 text-muted-foreground hover:text-foreground"
                        aria-label={t("decrease")}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => canIncrease && updateQuantity(item.id, item.quantity + 1)}
                        disabled={!canIncrease}
                        className="p-2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={t("increase")}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-primary">
                      {formatEuro(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Forma de entrega deste agricultor: vale para todos os artigos acima. */}
        <div className="space-y-3 border-t border-border bg-muted/20 p-4">
          {!state.ready ? null : state.noCommonOption ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground">
              {t("noCommonOption")}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("howReceive")}</p>
                <RadioGroup
                  value={fulfillment ?? undefined}
                  onValueChange={(v) => onChange({ fulfillment: v as Fulfillment })}
                  className="grid grid-cols-2 gap-2"
                >
                  {state.options.map((o) => (
                    <label
                      key={o}
                      htmlFor={`fulfillment-${farmerId}-${o}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                        fulfillment === o ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/50",
                      )}
                    >
                      <RadioGroupItem value={o} id={`fulfillment-${farmerId}-${o}`} className="sr-only" />
                      {o === "delivery" ? (
                        <Truck className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Store className="h-4 w-4 shrink-0 text-primary" />
                      )}
                      <span className="font-medium text-foreground">{FULFILLMENT_LABELS[o]}</span>
                    </label>
                  ))}
                </RadioGroup>
                {items.length > 1 && <p className="text-[11px] text-muted-foreground">{t("groupChoiceHint")}</p>}
              </div>

              {/* Agendamento: porta aberta (levantamento) ou horário de entregas. */}
              {fulfillment &&
                (state.needsSchedule ? (
                  <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      {isDelivery ? t("scheduleDelivery") : t("schedulePickup")}
                    </div>
                    <Select value={state.slot} onValueChange={(slot) => onChange({ slot })}>
                      <SelectTrigger aria-label={isDelivery ? t("deliveryTime") : t("pickupTime")}>
                        <SelectValue placeholder={t("chooseDateTime")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {state.slots.map((d) => (
                          <SelectItem key={d.toISOString()} value={d.toISOString()}>
                            {formatSlotDate(d)} · {formatSlotTime(d)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {isDelivery
                        ? state.prepDays > 0
                          ? t("slotsDeliveryPrep", { count: state.prepDays })
                          : t("slotsDelivery")
                        : t("slotsPickup")}
                      {note && (
                        <>
                          {" "}
                          <TranslatedText
                            type="farm"
                            id={farmerId}
                            field={isDelivery ? "delivery_note" : "pickup_hours_note"}
                            text={note}
                          />
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    {isDelivery
                      ? state.prepDays > 0
                        ? t("noDeliveryHoursPrep", { count: state.prepDays })
                        : t("noDeliveryHours")
                      : t("noPickupHours")}
                  </p>
                ))}

              {/* Levantamento: caminho até à quinta no Google Maps. */}
              {fulfillment === "pickup" && settings?.farmPoint && (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={directionsUrl(settings.farmPoint)} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4" />
                    {t("directionsFarm")}
                  </a>
                </Button>
              )}

              {/* Entrega ao domicílio: morada e ponto exato no mapa, dentro do raio do agricultor. */}
              {isDelivery && (
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Truck className="h-4 w-4 text-primary" />
                    {t("homeDelivery")}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {settings?.radiusKm != null
                      ? t("handDeliveryRadius", { km: settings.radiusKm })
                      : t("handDelivery")}
                  </p>
                  <Label htmlFor={`delivery-address-${farmerId}`} className="text-xs">
                    {t("address")}
                  </Label>
                  <Input
                    id={`delivery-address-${farmerId}`}
                    value={choice.address}
                    onChange={(e) => onChange({ address: e.target.value })}
                    placeholder={t("addressPlaceholder")}
                  />
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onOpenMap}>
                    <MapPin className="h-4 w-4" />
                    {choice.point ? t("pointChange") : t("pointMark")}
                  </Button>
                  {choice.point && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("point", { coords: `${choice.point.lat.toFixed(5)}, ${choice.point.lng.toFixed(5)}` })}
                    </p>
                  )}
                  {state.outOfRadius && (
                    <p className="text-[11px] font-medium text-destructive">
                      {t("outOfRadius", { km: settings?.radiusKm })}
                    </p>
                  )}
                  {state.trackingAvailable && (
                    <RadioGroup
                      value={choice.tracking ? "with" : "without"}
                      onValueChange={(v) => onChange({ tracking: v === "with" })}
                      className="gap-2 pt-2"
                    >
                      <label
                        htmlFor={`tracking-with-${farmerId}`}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50"
                      >
                        <RadioGroupItem value="with" id={`tracking-with-${farmerId}`} className="mt-0.5" />
                        <div>
                          <div className="text-sm font-medium">{t("withTracking")}</div>
                          <p className="text-[11px] text-muted-foreground">{t("withTrackingText")}</p>
                        </div>
                      </label>
                      <label
                        htmlFor={`tracking-without-${farmerId}`}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50"
                      >
                        <RadioGroupItem value="without" id={`tracking-without-${farmerId}`} className="mt-0.5" />
                        <div className="text-sm font-medium">{t("withoutTracking")}</div>
                      </label>
                    </RadioGroup>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  },
);
CartFarmerGroup.displayName = "CartFarmerGroup";

export default CartFarmerGroup;
