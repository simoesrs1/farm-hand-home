import { useEffect, useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Loader2,
  Pencil,
  PlusCircle,
  RotateCcw,
  ShoppingBag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type HistoryRow = Tables<"product_history">;
type FieldChange = { old: unknown; new: unknown };

const EVENTS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  created: { label: "Produto criado", icon: PlusCircle, tone: "bg-primary/10 text-primary" },
  stock_added: {
    label: "Stock adicionado",
    icon: ArrowUpCircle,
    tone: "bg-primary/10 text-primary",
  },
  stock_removed: {
    label: "Stock retirado",
    icon: ArrowDownCircle,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  sale: { label: "Venda", icon: ShoppingBag, tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  updated: { label: "Dados alterados", icon: Pencil, tone: "bg-muted text-muted-foreground" },
  deleted: { label: "Produto eliminado", icon: Trash2, tone: "bg-destructive/10 text-destructive" },
  restored: { label: "Produto reativado", icon: RotateCcw, tone: "bg-primary/10 text-primary" },
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  description: "Descrição",
  category: "Categoria",
  unit: "Unidade",
  farmer_price: "Preço que recebe",
  client_price: "Preço ao cliente",
  vat_rate: "IVA",
  discount_percent: "Desconto",
  low_stock_threshold: "Aviso de stock baixo",
  delivery_mode: "Forma de entrega",
  local_delivery: "Entrega ao domicílio",
  shipping_days: "Dias de envio",
  availability_start: "Início da disponibilidade",
  availability_end: "Fim da disponibilidade",
  is_organic: "Biológico",
  is_lactose_free: "Sem lactose",
  has_modifications: "Com modificações",
  modifications_description: "Modificações",
  media_urls: "Fotografias",
  active: "Ativo",
};

const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Levantamento",
  shipping: "Envio",
  both: "Levantamento ou envio",
};

const formatDateTime = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: pt });

const formatValue = (field: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (field === "farmer_price" || field === "client_price") return `${Number(value).toFixed(2)} €`;
  if (field === "vat_rate" || field === "discount_percent") return `${value}%`;
  if (field === "delivery_mode") return DELIVERY_LABELS[String(value)] ?? String(value);
  if (field === "availability_start" || field === "availability_end") {
    return format(new Date(`${value}T00:00:00`), "dd/MM/yyyy", { locale: pt });
  }
  if (Array.isArray(value)) return `${value.length}`;
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
};

const actorLabel = (row: HistoryRow) => {
  if (row.event_type === "sale") return "Cliente";
  return row.actor_name || (row.actor_id ? "Utilizador" : "Sistema");
};

interface ProductHistoryDialogProps {
  productId: string | null;
  productName?: string;
  unit?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProductHistoryDialog = ({
  productId,
  productName,
  unit,
  open,
  onOpenChange,
}: ProductHistoryDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("product_history")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  const created = rows.find((r) => r.event_type === "created");
  const lastChange = rows.find((r) => r.event_type !== "created");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico do produto
          </DialogTitle>
          {productName && <DialogDescription>{productName}</DialogDescription>}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">
            Não foi possível carregar o histórico: {error}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ainda não há registos para este produto.
          </p>
        ) : (
          <>
            <dl className="grid gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Criado por</dt>
                <dd className="font-medium">{created ? actorLabel(created) : "—"}</dd>
                <dd className="text-xs text-muted-foreground">
                  {created ? formatDateTime(created.created_at) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Última alteração por</dt>
                <dd className="font-medium">{lastChange ? actorLabel(lastChange) : "—"}</dd>
                <dd className="text-xs text-muted-foreground">
                  {lastChange ? formatDateTime(lastChange.created_at) : "Sem alterações"}
                </dd>
              </div>
            </dl>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-1">
              <ol className="relative ml-3 space-y-4 border-l border-border pl-6">
                {rows.map((row) => {
                  const meta = EVENTS[row.event_type] ?? EVENTS.updated;
                  const Icon = meta.icon;
                  const changes = Object.entries(
                    (row.changes ?? {}) as Record<string, FieldChange>,
                  ).filter(([field]) => field !== "active");
                  const delta = row.quantity_delta;
                  return (
                    <li key={row.id} className="relative">
                      <span
                        className={`absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${meta.tone}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-sm font-medium text-foreground">
                          {meta.label}
                          {row.event_type === "sale" && row.order_id && (
                            <span className="ml-1 font-normal text-muted-foreground">
                              · encomenda #{row.order_id.slice(0, 8)}
                            </span>
                          )}
                        </p>
                        <time className="text-xs text-muted-foreground" dateTime={row.created_at}>
                          {formatDateTime(row.created_at)}
                        </time>
                      </div>
                      <p className="text-xs text-muted-foreground">por {actorLabel(row)}</p>

                      {delta != null && delta !== 0 && row.event_type !== "created" && (
                        <p className="mt-1 text-sm">
                          <span
                            className={
                              delta > 0
                                ? "font-semibold text-primary"
                                : "font-semibold text-amber-700 dark:text-amber-400"
                            }
                          >
                            {delta > 0 ? "+" : "−"}
                            {Math.abs(delta)}
                            {unit ? ` ${unit}` : ""}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · stock {row.stock_before} → {row.stock_after}
                          </span>
                        </p>
                      )}
                      {row.event_type === "created" && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.stock_after != null
                            ? `Stock inicial: ${row.stock_after}`
                            : row.note ?? "Stock inicial desconhecido"}
                        </p>
                      )}

                      {changes.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs">
                          {changes.map(([field, c]) => (
                            <li key={field} className="text-muted-foreground">
                              <span className="text-foreground">{FIELD_LABELS[field] ?? field}:</span>{" "}
                              {field === "media_urls" ? (
                                `${formatValue(field, c.old)} → ${formatValue(field, c.new)} ficheiro(s)`
                              ) : (
                                <>
                                  <span className="line-through">{formatValue(field, c.old)}</span>
                                  {" → "}
                                  {formatValue(field, c.new)}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductHistoryDialog;
