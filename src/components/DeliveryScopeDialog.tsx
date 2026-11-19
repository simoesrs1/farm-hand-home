import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DELIVERY_FIELD_LABELS, type DeliverySettings } from "@/lib/delivery-defaults";
import { useTranslation } from "react-i18next";

export type DeliveryScope = "product" | "all";

interface DeliveryScopeDialogProps {
  open: boolean;
  fields: (keyof DeliverySettings)[];
  onChoose: (scope: DeliveryScope) => void;
  onCancel: () => void;
}

/** Pergunta se a alteração da entrega vale só para este produto ou para todos. */
const DeliveryScopeDialog = ({ open, fields, onChoose, onCancel }: DeliveryScopeDialogProps) => {
  const { t } = useTranslation(["farmer", "common"]);
  return (
  <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("deliveryScope.title")}</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2">
            <p>{t("deliveryScope.question")}</p>
            <ul className="list-disc pl-5">
              {fields.map((f) => (
                <li key={f}>{DELIVERY_FIELD_LABELS[f]}</li>
              ))}
            </ul>
            <p className="text-xs">
              {t("deliveryScope.explain")}
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
        <Button variant="outline" onClick={() => onChoose("product")}>
          {t("deliveryScope.thisOne")}
        </Button>
        <AlertDialogAction onClick={() => onChoose("all")}>{t("deliveryScope.all")}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  );
};

export default DeliveryScopeDialog;
