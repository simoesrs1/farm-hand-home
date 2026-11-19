import { Clock } from "lucide-react";
import { pickupStatus, type PickupWindow } from "@/lib/pickup-hours";
import { useTranslation } from "react-i18next";

interface Props {
  windows: PickupWindow[];
  className?: string;
}

/** Shows the client whether the farmer's door is open right now for pickup. */
const PickupAvailabilityBadge = ({ windows, className = "" }: Props) => {
  // Volta a desenhar quando muda o idioma (o texto vem de pickupStatus).
  useTranslation();
  const status = pickupStatus(windows);
  if (!status) return null;

  return (
    <span
      className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        status.open
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-muted text-muted-foreground"
      } ${className}`}
    >
      <Clock className="h-3 w-3" />
      {status.label}
    </span>
  );
};

export default PickupAvailabilityBadge;
