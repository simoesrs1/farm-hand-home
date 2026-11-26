import { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarX,
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
import { amountLabel, formatDate, formatEuro, formatTime } from "@/lib/format";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

type HistoryRow = Tables<"product_history">;
type FieldChange = { old: unknown; new: unknown };

// Ícone e cor de cada evento; o nome vem de farmer:history.events.<tipo>.
const EVENTS: Record<string, { icon: LucideIcon; tone: string }> = {
  created: { icon: PlusCircle, tone: "bg-success/10 text-success" },
  stock_added: { icon: ArrowUpCircle, tone: "bg-success/10 text-success" },
  stock_removed: { icon: ArrowDownCircle, tone: "bg-warning/10 text-warning" },
  sale: { icon: ShoppingBag, tone: "bg-info/10 text-info" },
  expired: { icon: CalendarX, tone: "bg-destructive/10 text-destructive" },
  updated: { icon: Pencil, tone: "bg-muted text-muted-foreground" },
  deleted: { icon: Trash2, tone: "bg-destructive/10 text-destructive" },
  restored: { icon: RotateCcw, tone: "bg-success/10 text-success" },
};

const eventLabel = (type: string) =>
  i18n.t(`farmer:history.events.${type in EVENTS ? type : "updated"}` as "farmer:history.events.updated");

/** Nome do campo alterado (local_delivery já não existe, mas fica nos registos antigos). */
const fieldLabel = (field: string) =>
  i18n.t(`farmer:history.fields.${field}` as "farmer:history.fields.name", { defaultValue: field });

const deliveryLabel = (value: string) =>
  i18n.t(`farmer:history.delivery.${value}` as "farmer:history.delivery.pickup", { defaultValue: value });

const formatStamp = (iso: string) =>
  i18n.t("orders:statusPage.at", { date: formatDate(iso), time: formatTime(iso) });

const formatValue = (field: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? i18n.t("common:actions.yes") : i18n.t("common:actions.no");
  if (field === "farmer_price" || field === "client_price") return `${formatEuro(Number(value))}`;
  if (field === "vat_rate" || field === "discount_percent") return `${value}%`;
  if (field === "delivery_mode") return deliveryLabel(String(value));
  if (field === "availability_start" || field === "availability_end") {
    return formatDate(`${value}T00:00:00`);
  }
  if (Array.isArray(value)) return `${value.length}`;
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
};

const actorLabel = (row: HistoryRow) => {
  if (row.event_type === "sale") return i18n.t("farmer:history.client");
  // A expiração é automática, mesmo quando é a página do agricultor a dispará-la.
  if (row.event_type === "expired") return i18n.t("farmer:history.system");
  return row.actor_name || (row.actor_id ? i18n.t("farmer:history.user") : i18n.t("farmer:history.system"));
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
  const { t } = useTranslation("farmer");
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
            {t("history.title")}
          </DialogTitle>
          {productName && <DialogDescription>{productName}</DialogDescription>}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">
            {t("history.loadFailed", { error })}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("history.none")}
          </p>
        ) : (
          <>
            <dl className="grid gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">{t("history.createdBy")}</dt>
                <dd className="font-medium">{created ? actorLabel(created) : "—"}</dd>
                <dd className="text-xs text-muted-foreground">
                  {created ? formatStamp(created.created_at) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("history.lastChangeBy")}</dt>
                <dd className="font-medium">{lastChange ? actorLabel(lastChange) : "—"}</dd>
                <dd className="text-xs text-muted-foreground">
                  {lastChange ? formatStamp(lastChange.created_at) : t("history.noChanges")}
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
                          {eventLabel(row.event_type)}
                          {row.event_type === "sale" && row.order_id && (
                            <span className="ml-1 font-normal text-muted-foreground">
                              · {t("history.order", { id: row.order_id.slice(0, 8) })}
                            </span>
                          )}
                        </p>
                        <time className="text-xs text-muted-foreground" dateTime={row.created_at}>
                          {formatStamp(row.created_at)}
                        </time>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("history.by", { actor: actorLabel(row) })}</p>

                      {delta != null && delta !== 0 && row.event_type !== "created" && (
                        <p className="mt-1 text-sm">
                          <span
                            className={
                              delta > 0
                                ? "font-semibold text-success"
                                : "font-semibold text-warning"
                            }
                          >
                            {delta > 0 ? "+" : "−"}
                            {amountLabel(Math.abs(delta), unit)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {t("history.stock", { before: row.stock_before, after: row.stock_after })}
                          </span>
                        </p>
                      )}
                      {row.event_type === "created" && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.stock_after != null
                            ? t("history.initialStock", { count: row.stock_after })
                            : row.note ?? t("history.initialUnknown")}
                        </p>
                      )}

                      {changes.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs">
                          {changes.map(([field, c]) => (
                            <li key={field} className="text-muted-foreground">
                              <span className="text-foreground">{fieldLabel(field)}:</span>{" "}
                              {field === "media_urls" ? (
                                `${formatValue(field, c.old)} → ${t("history.files", { count: Number(formatValue(field, c.new)) || 0 })}`
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
