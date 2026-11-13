import { useState } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DAY_LABELS } from "@/lib/pickup-hours";
import { parseEuro } from "@/lib/delivery-defaults";
import { WEEK_ORDER } from "@/lib/experience-sessions";
import { uploadMedia } from "@/lib/media-upload";
import { REGISTRATION_LABELS, type BlockedRange, type StayPricingMode } from "@/lib/stay-pricing";
import GiftListEditor, { type GiftDraft } from "@/components/GiftListEditor";
import MediaListEditor from "@/components/MediaListEditor";

export type StayRow = Tables<"farm_stays">;

interface StayFormProps {
  farmerId: string;
  /** Alojamento a editar; sem ele, cria um novo. */
  stay?: StayRow | null;
  gifts?: { product_id: string; extra_price: number }[];
  blocked?: BlockedRange[];
  onSaved: () => void;
}

const toDraftPrice = (n: number) => (n > 0 ? String(n).replace(".", ",") : "");

/** Formulário único para criar e editar alojamento (área do agricultor). */
const StayForm = ({ farmerId, stay, gifts: initialGifts = [], blocked: initialBlocked = [], onSaved }: StayFormProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(stay?.title ?? "");
  const [description, setDescription] = useState(stay?.description ?? "");
  const [pricingMode, setPricingMode] = useState<StayPricingMode>((stay?.pricing_mode as StayPricingMode) ?? "per_room");
  const [basePrice, setBasePrice] = useState(stay ? toDraftPrice(Number(stay.base_price)) : "");
  const [dayPrices, setDayPrices] = useState<Record<number, string>>(() => {
    const raw = (stay?.day_prices ?? {}) as Record<string, number>;
    return Object.fromEntries(Object.entries(raw).map(([d, v]) => [Number(d), toDraftPrice(Number(v))]));
  });
  const [unitsCount, setUnitsCount] = useState(String(stay?.units_count ?? 1));
  const [capacity, setCapacity] = useState(String(stay?.capacity_per_unit ?? 2));
  const [minNights, setMinNights] = useState(String(stay?.min_nights ?? 1));
  const [checkInTime, setCheckInTime] = useState(stay?.check_in_time ?? "15:00");
  const [checkOutTime, setCheckOutTime] = useState(stay?.check_out_time ?? "11:00");
  const [registrationType, setRegistrationType] = useState(stay?.registration_type ?? "AL");
  const [registrationNumber, setRegistrationNumber] = useState(stay?.registration_number ?? "");
  const [blocked, setBlocked] = useState<BlockedRange[]>(initialBlocked);
  const [newBlock, setNewBlock] = useState<BlockedRange>({ start_date: "", end_date: "" });
  const [gifts, setGifts] = useState<GiftDraft[]>(
    initialGifts.map((g) => ({ product_id: g.product_id, extra_price: toDraftPrice(g.extra_price) })),
  );
  const [keepWithoutGift, setKeepWithoutGift] = useState(stay?.keep_without_gift ?? false);
  const [active, setActive] = useState(stay?.active ?? true);
  const [existingMedia, setExistingMedia] = useState<string[]>(stay?.media_urls ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const addBlock = () => {
    if (!newBlock.start_date || !newBlock.end_date || newBlock.end_date < newBlock.start_date) {
      toast({ title: "Indique um intervalo de datas válido", variant: "destructive" });
      return;
    }
    setBlocked((b) => [...b, newBlock].sort((x, y) => x.start_date.localeCompare(y.start_date)));
    setNewBlock({ start_date: "", end_date: "" });
  };

  const save = async () => {
    if (!user) return;
    const base = parseEuro(basePrice);
    const units = parseInt(unitsCount, 10);
    const cap = parseInt(capacity, 10);
    const nights = parseInt(minNights, 10);
    const parsedDayPrices = Object.entries(dayPrices)
      .filter(([, v]) => v.trim() !== "")
      .map(([d, v]) => [d, parseEuro(v)] as const);
    const parsedGifts = gifts.map((g) => ({ ...g, price: g.extra_price.trim() ? parseEuro(g.extra_price) : 0 }));
    const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

    const problem =
      title.trim().length < 3 ? "Indique o título do alojamento." :
      description.trim().length < 20 ? "Descreva o alojamento (mínimo 20 caracteres)." :
      !base || base <= 0 ? "Indique um preço por noite válido." :
      parsedDayPrices.some(([, v]) => !v || v <= 0) ? "Os preços por dia têm de ser valores válidos." :
      !Number.isInteger(units) || units < 1 || units > 50 ? "O número de quartos tem de estar entre 1 e 50." :
      !Number.isInteger(cap) || cap < 1 || cap > 20 ? "A lotação por quarto tem de estar entre 1 e 20 pessoas." :
      !Number.isInteger(nights) || nights < 1 || nights > 30 ? "O mínimo de noites tem de estar entre 1 e 30." :
      !TIME.test(checkInTime) || !TIME.test(checkOutTime) ? "Indique as horas de entrada e de saída." :
      registrationNumber.trim().length < 2 ? "Indique o número de registo do alojamento." :
      parsedGifts.some((g) => g.price === null) ? "Os preços dos brindes têm de ser valores válidos." :
      !parsedGifts.some((g) => g.price === 0) ? "Adicione pelo menos um brinde grátis." :
      null;
    if (problem) {
      toast({ title: problem, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const uploaded = await uploadMedia(user.id, files);
      const payload = {
        farmer_id: farmerId,
        title: title.trim(),
        description: description.trim(),
        media_urls: [...existingMedia, ...uploaded],
        pricing_mode: pricingMode,
        base_price: base,
        day_prices: Object.fromEntries(parsedDayPrices),
        units_count: units,
        capacity_per_unit: cap,
        min_nights: nights,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        registration_type: registrationType,
        registration_number: registrationNumber.trim(),
        keep_without_gift: keepWithoutGift,
        active,
      };
      let id = stay?.id;
      if (id) {
        const { error } = await supabase.from("farm_stays").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("farm_stays").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      // Brindes e datas fechadas: substitui as listas.
      const { error: delGifts } = await supabase.from("stay_gifts").delete().eq("stay_id", id);
      if (delGifts) throw delGifts;
      const { error: giftErr } = await supabase.from("stay_gifts").insert(
        parsedGifts.map((g, i) => ({ stay_id: id!, product_id: g.product_id, extra_price: g.price ?? 0, position: i })),
      );
      if (giftErr) throw giftErr;
      const { error: delBlocked } = await supabase.from("stay_blocked_dates").delete().eq("stay_id", id);
      if (delBlocked) throw delBlocked;
      if (blocked.length > 0) {
        const { error: blockErr } = await supabase
          .from("stay_blocked_dates")
          .insert(blocked.map((b) => ({ stay_id: id!, start_date: b.start_date, end_date: b.end_date })));
        if (blockErr) throw blockErr;
      }

      toast({ title: stay ? "Alojamento atualizado" : "Alojamento criado" });
      onSaved();
    } catch (err) {
      toast({
        title: "Erro a guardar o alojamento",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-medium">O alojamento</h2>
        <div className="space-y-2">
          <Label htmlFor="stay-title">Título *</Label>
          <Input id="stay-title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="Ex.: Quarto duplo com vista para a vinha" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stay-description">Descrição *</Label>
          <Textarea
            id="stay-description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
            placeholder="O quarto, as comodidades, o pequeno-almoço, o que há para fazer na quinta..."
          />
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <Label htmlFor="stay-active" className="text-sm font-medium">Alojamento ativo</Label>
            <p className="text-xs text-muted-foreground">Desligado, deixa de aparecer aos clientes e não aceita reservas.</p>
          </div>
          <Switch id="stay-active" checked={active} onCheckedChange={setActive} />
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Registo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stay-reg-type">Tipo de registo *</Label>
            <select
              id="stay-reg-type"
              value={registrationType}
              onChange={(e) => setRegistrationType(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(REGISTRATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stay-reg-number">Número de registo *</Label>
            <Input id="stay-reg-number" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value.slice(0, 40))} placeholder="Ex.: 123456/AL" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          O número de registo (RNAL ou RNET) é mostrado aos clientes. A taxa turística, a comunicação de hóspedes e a
          faturação são da responsabilidade do agricultor.
        </p>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Fotografias e vídeos</h2>
        <MediaListEditor existing={existingMedia} onExistingChange={setExistingMedia} files={files} onFilesChange={setFiles} />
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Quartos, lotação e estadia</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="stay-units">Quartos iguais deste tipo *</Label>
            <Input id="stay-units" type="number" min={1} max={50} value={unitsCount} onChange={(e) => setUnitsCount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stay-capacity">Lotação por quarto *</Label>
            <Input id="stay-capacity" type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stay-min-nights">Mínimo de noites *</Label>
            <Input id="stay-min-nights" type="number" min={1} max={30} value={minNights} onChange={(e) => setMinNights(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stay-check-in">Entrada a partir das *</Label>
            <Input id="stay-check-in" type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stay-check-out">Saída até às *</Label>
            <Input id="stay-check-out" type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Preço por noite</h2>
        <RadioGroup value={pricingMode} onValueChange={(v) => setPricingMode(v as StayPricingMode)} className="gap-2 sm:grid-cols-2">
          <label htmlFor="sp-room" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50">
            <RadioGroupItem value="per_room" id="sp-room" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">Por quarto</div>
              <p className="text-xs text-muted-foreground">O preço de cada noite multiplica pelo número de quartos.</p>
            </div>
          </label>
          <label htmlFor="sp-person" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50">
            <RadioGroupItem value="per_person" id="sp-person" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">Por pessoa</div>
              <p className="text-xs text-muted-foreground">O preço de cada noite multiplica pelo número de hóspedes.</p>
            </div>
          </label>
        </RadioGroup>
        <div className="space-y-2">
          <Label htmlFor="stay-price">Preço base por noite (€) *</Label>
          <Input id="stay-price" inputMode="decimal" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0,00" className="w-40" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Preço por noite em cada dia (opcional)</p>
          <p className="text-xs text-muted-foreground">Vale para a noite que começa nesse dia. Sem valor, vale o preço base.</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WEEK_ORDER.map((day) => (
              <div key={day} className="space-y-1">
                <Label htmlFor={`stay-day-${day}`} className="text-xs">{DAY_LABELS[day]}</Label>
                <Input
                  id={`stay-day-${day}`}
                  inputMode="decimal"
                  value={dayPrices[day] ?? ""}
                  onChange={(e) => setDayPrices((p) => ({ ...p, [day]: e.target.value }))}
                  placeholder="Base"
                  className="h-8"
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-medium">Datas fechadas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Noites em que o alojamento não aceita reservas (férias, obras, reservas noutros canais).
          </p>
        </div>
        {blocked.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {blocked.map((b, i) => (
              <li key={`${b.start_date}-${b.end_date}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                {new Date(`${b.start_date}T12:00:00Z`).toLocaleDateString("pt-PT", { timeZone: "UTC" })} –{" "}
                {new Date(`${b.end_date}T12:00:00Z`).toLocaleDateString("pt-PT", { timeZone: "UTC" })}
                <button type="button" onClick={() => setBlocked((list) => list.filter((_, j) => j !== i))} aria-label="Remover datas fechadas">
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="block-start" className="text-xs">De</Label>
            <Input id="block-start" type="date" value={newBlock.start_date} onChange={(e) => setNewBlock((b) => ({ ...b, start_date: e.target.value }))} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="block-end" className="text-xs">Até (inclusive)</Label>
            <Input id="block-end" type="date" value={newBlock.end_date} onChange={(e) => setNewBlock((b) => ({ ...b, end_date: e.target.value }))} className="h-9 w-40" />
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={addBlock}>
            <Plus className="h-4 w-4" /> Fechar datas
          </Button>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Brindes</h2>
        <GiftListEditor
          farmerId={farmerId}
          gifts={gifts}
          onGiftsChange={setGifts}
          keepWithoutGift={keepWithoutGift}
          onKeepWithoutGiftChange={setKeepWithoutGift}
          subject="O alojamento"
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar alojamento
        </Button>
      </div>
    </div>
  );
};

export default StayForm;
