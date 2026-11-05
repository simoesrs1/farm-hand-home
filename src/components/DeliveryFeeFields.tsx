import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeliveryFeeFieldsProps {
  fee: string;
  onFeeChange: (value: string) => void;
  freeThreshold: string;
  onFreeThresholdChange: (value: string) => void;
}

/** Preço da entrega ao domicílio e limite da entrega grátis (formulário de produto). */
const DeliveryFeeFields = ({ fee, onFeeChange, freeThreshold, onFreeThresholdChange }: DeliveryFeeFieldsProps) => (
  <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
    <div className="space-y-2">
      <Label htmlFor="delivery-fee">Preço da entrega (€)</Label>
      <Input
        id="delivery-fee"
        inputMode="decimal"
        value={fee}
        onChange={(e) => onFeeChange(e.target.value)}
        placeholder="0,00"
      />
      <p className="text-xs text-muted-foreground">
        Cobrado uma vez por encomenda. Deixe a 0 para entrega grátis. A plataforma não cobra
        comissão sobre a entrega.
      </p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="free-delivery">Entrega grátis a partir de (€)</Label>
      <Input
        id="free-delivery"
        inputMode="decimal"
        value={freeThreshold}
        onChange={(e) => onFreeThresholdChange(e.target.value)}
        placeholder="Sem limite"
      />
      <p className="text-xs text-muted-foreground">
        Valor das compras do cliente na sua quinta. Aplica-se a todos os seus produtos.
      </p>
    </div>
  </div>
);

export default DeliveryFeeFields;
