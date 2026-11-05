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

export type DeliveryScope = "product" | "all";

interface DeliveryScopeDialogProps {
  open: boolean;
  fields: (keyof DeliverySettings)[];
  onChoose: (scope: DeliveryScope) => void;
  onCancel: () => void;
}

/** Pergunta se a alteração da entrega vale só para este produto ou para todos. */
const DeliveryScopeDialog = ({ open, fields, onChoose, onCancel }: DeliveryScopeDialogProps) => (
  <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Alterou a entrega deste produto</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2">
            <p>Quer aplicar a alteração só a este produto ou a todos os produtos?</p>
            <ul className="list-disc pl-5">
              {fields.map((f) => (
                <li key={f}>{DELIVERY_FIELD_LABELS[f]}</li>
              ))}
            </ul>
            <p className="text-xs">
              Só este produto: o padrão mantém-se para os restantes e para os produtos novos. Todos
              os produtos: o padrão é atualizado e aplicado a todos os seus produtos.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <Button variant="outline" onClick={() => onChoose("product")}>
          Só este produto
        </Button>
        <AlertDialogAction onClick={() => onChoose("all")}>Todos os produtos</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeliveryScopeDialog;
