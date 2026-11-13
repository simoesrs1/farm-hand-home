import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { BedDouble, Clock, FileCheck, Gift, Loader2, Moon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { StayRow } from "@/components/StayForm";
import { FREE_CANCEL_DAYS, freeCancellationUntil } from "@/lib/experience-pricing";
import { addDaysISO, lisbonParts } from "@/lib/experience-sessions";
import { isVideoPath, signMedia } from "@/lib/media-upload";
import {
  REGISTRATION_LABELS,
  overlapsBlocked,
  stayAmount,
  stayNights,
  type BlockedRange,
  type StayPricingMode,
} from "@/lib/stay-pricing";

type GiftOption = {
  id: string;
  extra_price: number;
  product: { id: string; name: string; stock_quantity: number | null; active: boolean } | null;
};

const formatDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-PT", { timeZone: "UTC" });

interface StayDialogProps {
  stay: StayRow | null;
  farmName: string;
  /** O próprio agricultor a ver a sua página: não pode reservar. */
  isOwner: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Detalhes de um alojamento e reserva (perfil público do agricultor). */
const StayDialog = ({ stay, farmName, isOwner, onOpenChange }: StayDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [media, setMedia] = useState<Record<string, string>>({});
  const [gifts, setGifts] = useState<GiftOption[]>([]);
  const [blocked, setBlocked] = useState<BlockedRange[]>([]);
  const [usedByNight, setUsedByNight] = useState<Record<string, number>>({});
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [units, setUnits] = useState("1");
  const [guests, setGuests] = useState("1");
  const [paidGiftIds, setPaidGiftIds] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = lisbonParts(new Date()).date;
  const mode = (stay?.pricing_mode ?? "per_room") as StayPricingMode;

  useEffect(() => {
    if (!stay) return;
    setCheckIn("");
    setCheckOut("");
    setUnits("1");
    setGuests("1");
    setPaidGiftIds([]);
    setAccepted(false);
    let cancelled = false;
    (async () => {
      const [signed, { data: g }, { data: b }] = await Promise.all([
        signMedia(stay.media_urls),
        supabase
          .from("stay_gifts")
          .select("id, extra_price, product:product_id(id, name, stock_quantity, active)")
          .eq("stay_id", stay.id)
          .order("position"),
        supabase.from("stay_blocked_dates").select("start_date, end_date").eq("stay_id", stay.id),
      ]);
      if (cancelled) return;
      setMedia(signed);
      setGifts((g as unknown as GiftOption[]) ?? []);
      setBlocked(b ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [stay]);

  // Quartos ocupados em cada noite das datas escolhidas.
  useEffect(() => {
    if (!stay || !checkIn || !checkOut || checkOut <= checkIn) {
      setUsedByNight({});
      return;
    }
    let cancelled = false;
    supabase
      .rpc("stay_booked_units", { p_stay_id: stay.id, p_from: checkIn, p_to: checkOut })
      .then(({ data }) => {
        if (!cancelled) setUsedByNight(Object.fromEntries((data ?? []).map((r) => [r.night, Number(r.units)])));
      });
    return () => {
      cancelled = true;
    };
  }, [stay, checkIn, checkOut]);

  const nights = useMemo(() => (checkIn && checkOut ? stayNights(checkIn, checkOut) : []), [checkIn, checkOut]);
  const inStock = (g: GiftOption) => !!g.product?.active && (g.product.stock_quantity ?? 0) >= 1;
  // O cliente recebe o primeiro brinde grátis com stock.
  const freeGift = gifts.find((g) => Number(g.extra_price) === 0 && inStock(g)) ?? null;
  const paidGifts = gifts.filter((g) => Number(g.extra_price) > 0 && inStock(g));
  const unavailable = !!stay && !freeGift && !stay.keep_without_gift;

  const unitsNum = parseInt(units, 10);
  const guestsNum = parseInt(guests, 10);
  const freeUnits = stay && nights.length ? Math.min(...nights.map((n) => stay.units_count - (usedByNight[n] ?? 0))) : stay?.units_count ?? 0;

  const problem = !stay || !checkIn || !checkOut
    ? null
    : checkOut <= checkIn ? "A data de saída tem de ser depois da entrada."
    : nights.length < stay.min_nights ? `A estadia mínima é de ${stay.min_nights} noite(s).`
    : overlapsBlocked(blocked, checkIn, checkOut) ? "O alojamento está fechado em parte destas datas."
    : freeUnits <= 0 ? "Não há quartos livres em todas estas noites."
    : !Number.isInteger(unitsNum) || unitsNum < 1 || unitsNum > freeUnits ? `Há ${freeUnits} quarto(s) livre(s) nestas datas.`
    : !Number.isInteger(guestsNum) || guestsNum < 1 || guestsNum > unitsNum * stay.capacity_per_unit
      ? `Para ${unitsNum} quarto(s), o máximo é de ${unitsNum * stay.capacity_per_unit} hóspedes.`
    : null;

  const amount = stay && nights.length && Number.isInteger(unitsNum) && Number.isInteger(guestsNum)
    ? stayAmount(mode, Number(stay.base_price), stay.day_prices, checkIn, checkOut, guestsNum, unitsNum)
    : 0;
  const giftsTotal = paidGifts.filter((g) => paidGiftIds.includes(g.id)).reduce((a, g) => a + Number(g.extra_price), 0);
  const total = Math.round((amount + giftsTotal) * 100) / 100;
  // Só para mostrar o prazo: data e hora de Lisboa tratadas como UTC (ver ExperienceDialog).
  const freeUntil = stay && checkIn ? freeCancellationUntil(new Date(`${checkIn}T${stay.check_in_time}:00Z`)) : null;

  const book = async () => {
    if (!stay || problem || !nights.length) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-stay-booking", {
      body: { stay_id: stay.id, check_in: checkIn, check_out: checkOut, guests: guestsNum, units: unitsNum, paid_gift_ids: paidGiftIds },
    });
    setSubmitting(false);
    if (error || (data as { error?: string } | null)?.error) {
      let msg = (data as { error?: string } | null)?.error ?? "Não foi possível concluir a reserva.";
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          if (body?.error) msg = body.error;
        } catch {
          // resposta sem JSON: fica a mensagem genérica
        }
      }
      toast({ title: "Reserva não concluída", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Reserva confirmada", description: "Pagamento simulado. O QR code está nas suas encomendas." });
    onOpenChange(false);
    navigate("/encomendas");
  };

  const photos = stay?.media_urls.filter((p) => media[p]) ?? [];

  return (
    <Dialog open={!!stay} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {stay && (
          <>
            <DialogHeader>
              <DialogTitle>{stay.title}</DialogTitle>
              <DialogDescription>Alojamento em {farmName}</DialogDescription>
            </DialogHeader>

            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p) =>
                  isVideoPath(p) ? (
                    <video key={p} src={media[p]} controls className="h-40 shrink-0 rounded-lg" />
                  ) : (
                    <img key={p} src={media[p]} alt="" className="h-40 shrink-0 rounded-lg object-cover" />
                  ),
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> até {stay.capacity_per_unit} por quarto</span>
              <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" /> {stay.units_count} quarto(s)</span>
              <span className="inline-flex items-center gap-1"><Moon className="h-4 w-4" /> mínimo {stay.min_nights} noite(s)</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> entrada {stay.check_in_time} · saída {stay.check_out_time}</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              Desde {Number(stay.base_price).toFixed(2)}€ / noite {mode === "per_person" ? "por pessoa" : "por quarto"}
            </p>

            <p className="whitespace-pre-line text-sm text-foreground">{stay.description}</p>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileCheck className="h-4 w-4 shrink-0" />
              {REGISTRATION_LABELS[stay.registration_type] ?? "Registo"} n.º {stay.registration_number}
            </p>

            {freeGift && (
              <p className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-foreground">
                <Gift className="h-4 w-4 shrink-0 text-primary" /> Inclui um brinde: {freeGift.product?.name}
              </p>
            )}

            <div className="border-t border-border pt-4">
              {isOwner ? (
                <p className="text-sm text-muted-foreground">É o seu alojamento: os clientes reservam a partir daqui.</p>
              ) : unavailable ? (
                <p className="text-sm text-muted-foreground">Indisponível de momento.</p>
              ) : !user ? (
                <Button asChild className="w-full">
                  <Link to="/auth">Iniciar sessão para reservar</Link>
                </Button>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">Reservar</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="st-in" className="text-xs">Entrada</Label>
                      <Input
                        id="st-in"
                        type="date"
                        min={today}
                        max={addDaysISO(today, 365)}
                        value={checkIn}
                        onChange={(e) => {
                          setCheckIn(e.target.value);
                          if (!checkOut || checkOut <= e.target.value) setCheckOut(addDaysISO(e.target.value, stay.min_nights));
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="st-out" className="text-xs">Saída</Label>
                      <Input
                        id="st-out"
                        type="date"
                        min={checkIn ? addDaysISO(checkIn, stay.min_nights) : today}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="st-units" className="text-xs">Quartos</Label>
                      <Input id="st-units" type="number" min={1} max={Math.max(1, freeUnits)} value={units} onChange={(e) => setUnits(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="st-guests" className="text-xs">Hóspedes</Label>
                      <Input id="st-guests" type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className="h-9" />
                    </div>
                  </div>

                  {problem && <p className="text-sm text-destructive">{problem}</p>}

                  {paidGifts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Brindes extra (opcional)</p>
                      {paidGifts.map((g) => (
                        <label key={g.id} htmlFor={`st-gift-${g.id}`} className="flex cursor-pointer items-center gap-3 text-sm">
                          <Checkbox
                            id={`st-gift-${g.id}`}
                            checked={paidGiftIds.includes(g.id)}
                            onCheckedChange={(v) =>
                              setPaidGiftIds((ids) => (v === true ? [...ids, g.id] : ids.filter((x) => x !== g.id)))
                            }
                          />
                          <span className="flex-1 text-foreground">{g.product?.name}</span>
                          <span className="text-muted-foreground">+{Number(g.extra_price).toFixed(2)}€</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between border-t border-border pt-3 text-sm">
                    <span className="font-medium text-foreground">
                      Total{nights.length > 0 && ` (${nights.length} noite${nights.length === 1 ? "" : "s"}, ${formatDate(checkIn)} a ${formatDate(checkOut)})`}
                    </span>
                    <span className="font-display text-lg font-bold text-primary">{total.toFixed(2)}€</span>
                  </div>

                  <label htmlFor="st-accept" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground">
                    <Checkbox id="st-accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
                    <span>
                      Cancelamento grátis até {FREE_CANCEL_DAYS} dias antes da entrada
                      {freeUntil ? ` (até ${freeUntil.toLocaleString("pt-PT", { timeZone: "UTC", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})` : ""}.
                      Depois disso, são retidos 25% do valor do alojamento, e os brindes extra são devolvidos.
                      Sem comparência, o valor não é devolvido.
                    </span>
                  </label>

                  <Button onClick={book} disabled={submitting || !accepted || !nights.length || !!problem} className="w-full gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Reservar e pagar {total.toFixed(2)}€ (simulado)
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StayDialog;
