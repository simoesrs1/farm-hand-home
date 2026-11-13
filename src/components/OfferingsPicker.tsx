import { Checkbox } from "@/components/ui/checkbox";
import { OFFERINGS, type Offerings } from "@/lib/farmer-offerings";

interface OfferingsPickerProps {
  value: Offerings;
  onChange: (value: Offerings) => void;
  disabled?: boolean;
}

/** Escolha do que o agricultor disponibiliza (uma, duas ou as três opções). */
const OfferingsPicker = ({ value, onChange, disabled }: OfferingsPickerProps) => (
  <div className="grid gap-2 sm:grid-cols-3">
    {OFFERINGS.map((o) => (
      <label
        key={o.key}
        htmlFor={`offer-${o.key}`}
        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50 ${
          value[o.key] ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <Checkbox
          id={`offer-${o.key}`}
          checked={value[o.key]}
          disabled={disabled}
          onCheckedChange={(v) => onChange({ ...value, [o.key]: v === true })}
          className="mt-0.5"
        />
        <div>
          <div className="text-sm font-medium text-foreground">{o.label}</div>
          <p className="text-xs text-muted-foreground">{o.description}</p>
        </div>
      </label>
    ))}
  </div>
);

export default OfferingsPicker;
