import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { CalendarDays, Clock, Gift, Loader2, Users } from "lucide-react";
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
import type { ExperienceRow } from "@/components/ExperienceForm";
import { DAY_LABELS } from "@/lib/pickup-hours";
import {
  FREE_CANCEL_DAYS,
  experienceAmount,
  freeCancellationUntil,
  unitPriceFor,
  type PricingMode,
} from "@/lib/experience-pricing";
import {
  addDaysISO,
  formatDuration,
  lisbonParts,
  normalizeSessions,
  slotKey,
  upcomingSessions,
  weekdayOf,
} from "@/lib/experience-sessions";

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" });

const BOOKING_DAYS = 60;

type GiftOption = {
  id: string;
  extra_price: number;
  product: { id: string; name: string; stock_quantity: number | null; active: boolean } | null;
};

interface ExperienceDialogProps {
  experience: ExperienceRow | null;
  farmName: string;
  /** O próprio agricultor a ver a sua página: não pode reservar. */
  isOwner: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Detalhes de uma experiência e reserva (perfil público do agricultor). */
const ExperienceDialog = ({ experience, farmName, isOwner, onOpenChange }: ExperienceDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [media, setMedia] = useState<{ path: string; url: string }[]>([]);
  const [gifts, setGifts] = useState<GiftOption[]>([]);
  const [booked, setBooked] = useState<Record<string, { people: number; bookings: number }>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [people, setPeople] = useState("");
  const [paidGiftIds, setPaidGiftIds] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const exp = experience;
  const mode = (exp?.pricing_mode ?? "per_person") as PricingMode;
  const sessions = useMemo(() => normalizeSessions(exp?.sessions), [exp]);
  const slots = useMemo(() => upcomingSessions(sessions, BOOKING_DAYS), [sessions]);

  useEffect(() => {
    if (!exp) return;
    setDate("");
    setTime("");
    setPeople(String(exp.min_people));
    setPaidGiftIds([]);
    setAccepted(false);
    let cancelled = false;
    (async () => {
      const today = lisbonParts(new Date()).date;
      const [signed, { data: g }, { data: b }] = await Promise.all([
        Promise.all(
          exp.media_urls.map(async (path) => {
            const { data } = await supabase.storage.from("product-media").createSignedUrl(path, 60 * 60);
            return data?.signedUrl ? { path, url: data.signedUrl } : null;
          }),
        ),
        supabase
          .from("experience_gifts")
          .select("id, extra_price, product:product_id(id, name, stock_quantity, active)")
          .eq("experience_id", exp.id)
          .order("position"),
        supabase.rpc("experience_session_bookings", {
          p_experience_id: exp.id,
          p_from: new Date(`${today}T00:00:00Z`).toISOString(),
          p_to: new Date(`${addDaysISO(today, BOOKING_DAYS + 1)}T00:00:00Z`).toISOString(),
        }),
      ]);
      if (cancelled) return;
      setMedia(signed.filter((m): m is { path: string; url: string } => m !== null));
      setGifts((g as unknown as GiftOption[]) ?? []);
      setBooked(
        Object.fromEntries(
          (b ?? []).map((r) => [slotKey(lisbonParts(new Date(r.booking_start))), { people: Number(r.people), bookings: Number(r.bookings) }]),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [exp]);

  const inStock = (g: GiftOption) => !!g.product?.active && (g.product.stock_quantity ?? 0) >= 1;
  // O cliente recebe o primeiro brinde grátis com stock.
  const freeGift = gifts.find((g) => Number(g.extra_price) === 0 && inStock(g)) ?? null;
  const paidGifts = gifts.filter((g) => Number(g.extra_price) > 0 && inStock(g));
  const unavailable = !!exp && !freeGift && !exp.keep_without_gift;

  const remainingFor = (d: string, t: string) => {
    if (!exp) return 0;
    const b = booked[slotKey({ date: d, time: t })];
    if (mode === "per_group") return b && b.bookings > 0 ? 0 : exp.max_people;
    return exp.max_people - (b?.people ?? 0);
  };
  const openSlots = slots.filter((s) => remainingFor(s.date, s.time) >= (exp?.min_people ?? 1));
  const dates = [...new Set(openSlots.map((s) => s.date))];
  const times = openSlots.filter((s) => s.date === date).map((s) => s.time);
  const remaining = date && time ? remainingFor(date, time) : exp?.max_people ?? 0;
  const maxForBooking = Math.min(exp?.max_people ?? 0, remaining);

  const peopleNum = parseInt(people, 10);
  const unit = exp && date ? unitPriceFor(Number(exp.base_price), exp.day_prices, weekdayOf(date)) : Number(exp?.base_price ?? 0);
  const expTotal = Number.isFinite(peopleNum) ? experienceAmount(mode, unit, peopleNum) : 0;
  const giftsTotal = paidGifts.filter((g) => paidGiftIds.includes(g.id)).reduce((a, g) => a + Number(g.extra_price), 0);
  const total = Math.round((expTotal + giftsTotal) * 100) / 100;
  // Só para mostrar o prazo: a data e hora de Lisboa tratadas como UTC, e
  // formatadas em UTC, dão a hora de Lisboa 5 dias antes. O servidor usa o instante real.
  const freeUntil = date && time ? freeCancellationUntil(new Date(`${date}T${time}:00Z`)) : null;

  const book = async () => {
    if (!exp) return;
    if (!date || !time) {
      toast({ title: "Escolha o dia e a hora", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(peopleNum) || peopleNum < exp.min_people || peopleNum > maxForBooking) {
      toast({ title: `Indique entre ${exp.min_people} e ${maxForBooking} pessoas`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-booking", {
      body: { experience_id: exp.id, date, time, people: peopleNum, paid_gift_ids: paidGiftIds },
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

  return (
    <Dialog open={!!exp} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {exp && (
          <>
            <DialogHeader>
              <DialogTitle>{exp.title}</DialogTitle>
              <DialogDescription>Experiência em {farmName}</DialogDescription>
            </DialogHeader>

            {media.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {media.map((m) =>
                  /\.(mp4|webm|mov)$/i.test(m.path) ? (
                    <video key={m.path} src={m.url} controls className="h-40 shrink-0 rounded-lg" />
                  ) : (
                    <img key={m.path} src={m.url} alt="" className="h-40 shrink-0 rounded-lg object-cover" />
                  ),
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {formatDuration(exp.duration_minutes)}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {exp.min_people}–{exp.max_people} pessoas</span>
              <span className="font-medium text-foreground">
                {Number(exp.base_price).toFixed(2)}€ {mode === "per_person" ? "por pessoa" : "por grupo"}
              </span>
            </div>

            <p className="whitespace-pre-line text-sm text-foreground">{exp.description}</p>

            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Sessões</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {sessions.map((s) => {
                  const dayPrice = unitPriceFor(Number(exp.base_price), exp.day_prices, s.day);
                  return (
                    <li key={s.day}>
                      {DAY_LABELS[s.day]}: {s.times.join(", ")}
                      {dayPrice !== Number(exp.base_price) && ` · ${dayPrice.toFixed(2)}€`}
                    </li>
                  );
                })}
              </ul>
            </div>

            {freeGift && (
              <p className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-foreground">
                <Gift className="h-4 w-4 shrink-0 text-primary" /> Inclui um brinde: {freeGift.product?.name}
              </p>
            )}

            <div className="border-t border-border pt-4">
              {isOwner ? (
                <p className="text-sm text-muted-foreground">É a sua experiência: os clientes reservam a partir daqui.</p>
              ) : unavailable ? (
                <p className="text-sm text-muted-foreground">Indisponível de momento.</p>
              ) : !user ? (
                <Button asChild className="w-full">
                  <Link to="/auth">Iniciar sessão para reservar</Link>
                </Button>
              ) : dates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem sessões disponíveis nos próximos {BOOKING_DAYS} dias.</p>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">Reservar</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="bk-date" className="text-xs">Dia</Label>
                      <select
                        id="bk-date"
                        value={date}
                        onChange={(e) => {
                          setDate(e.target.value);
                          setTime("");
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Escolher...</option>
                        {dates.map((d) => (
                          <option key={d} value={d}>{formatDay(d)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bk-time" className="text-xs">Hora</Label>
                      <select
                        id="bk-time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        disabled={!date}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Escolher...</option>
                        {times.map((t) => (
                          <option key={t} value={t}>
                            {t}{mode === "per_person" ? ` (${remainingFor(date, t)} lugares)` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bk-people" className="text-xs">Pessoas</Label>
                      <Input
                        id="bk-people"
                        type="number"
                        min={exp.min_people}
                        max={maxForBooking}
                        value={people}
                        onChange={(e) => setPeople(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {paidGifts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Brindes extra (opcional)</p>
                      {paidGifts.map((g) => (
                        <label key={g.id} htmlFor={`gift-${g.id}`} className="flex cursor-pointer items-center gap-3 text-sm">
                          <Checkbox
                            id={`gift-${g.id}`}
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
                    <span className="font-medium text-foreground">Total</span>
                    <span className="font-display text-lg font-bold text-primary">{total.toFixed(2)}€</span>
                  </div>

                  <label htmlFor="bk-accept" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground">
                    <Checkbox id="bk-accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
                    <span>
                      Cancelamento grátis até {FREE_CANCEL_DAYS} dias antes da sessão
                      {freeUntil ? ` (até ${freeUntil.toLocaleString("pt-PT", { timeZone: "UTC", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})` : ""}.
                      Depois disso, são retidos 25% do valor da experiência, e os brindes extra são devolvidos.
                      Sem comparência, o valor não é devolvido.
                    </span>
                  </label>

                  <Button onClick={book} disabled={submitting || !accepted || !date || !time} className="w-full gap-2">
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

export default ExperienceDialog;
