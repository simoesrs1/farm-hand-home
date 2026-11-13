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
import { WEEK_ORDER, normalizeSessions } from "@/lib/experience-sessions";
import type { PricingMode } from "@/lib/experience-pricing";
import { uploadMedia } from "@/lib/media-upload";
import GiftListEditor, { type GiftDraft } from "@/components/GiftListEditor";
import MediaListEditor from "@/components/MediaListEditor";

export type ExperienceRow = Tables<"farm_experiences">;

interface ExperienceFormProps {
  farmerId: string;
  /** Experiência a editar; sem ela, cria uma nova. */
  experience?: ExperienceRow | null;
  gifts?: { product_id: string; extra_price: number }[];
  onSaved: () => void;
}

/** Formulário único para criar e editar experiências (área do agricultor). */
const ExperienceForm = ({ farmerId, experience, gifts: initialGifts = [], onSaved }: ExperienceFormProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(experience?.title ?? "");
  const [description, setDescription] = useState(experience?.description ?? "");
  const [duration, setDuration] = useState(String(experience?.duration_minutes ?? 120));
  const [pricingMode, setPricingMode] = useState<PricingMode>((experience?.pricing_mode as PricingMode) ?? "per_person");
  const [basePrice, setBasePrice] = useState(experience ? String(experience.base_price).replace(".", ",") : "");
  const [dayPrices, setDayPrices] = useState<Record<number, string>>(() => {
    const raw = (experience?.day_prices ?? {}) as Record<string, number>;
    return Object.fromEntries(Object.entries(raw).map(([d, v]) => [Number(d), String(v).replace(".", ",")]));
  });
  const [minPeople, setMinPeople] = useState(String(experience?.min_people ?? 1));
  const [maxPeople, setMaxPeople] = useState(String(experience?.max_people ?? 10));
  const [sessions, setSessions] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(normalizeSessions(experience?.sessions).map((s) => [s.day, s.times])),
  );
  const [newTime, setNewTime] = useState<Record<number, string>>({});
  const [gifts, setGifts] = useState<GiftDraft[]>(
    initialGifts.map((g) => ({ product_id: g.product_id, extra_price: g.extra_price > 0 ? String(g.extra_price).replace(".", ",") : "" })),
  );
  const [keepWithoutGift, setKeepWithoutGift] = useState(experience?.keep_without_gift ?? false);
  const [active, setActive] = useState(experience?.active ?? true);
  const [existingMedia, setExistingMedia] = useState<string[]>(experience?.media_urls ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const addTime = (day: number) => {
    const t = newTime[day];
    if (!t) return;
    setSessions((s) => ({ ...s, [day]: [...new Set([...(s[day] ?? []), t])].sort() }));
    setNewTime((n) => ({ ...n, [day]: "" }));
  };

  const save = async () => {
    if (!user) return;
    const base = parseEuro(basePrice);
    const min = parseInt(minPeople, 10);
    const max = parseInt(maxPeople, 10);
    const minutes = parseInt(duration, 10);
    const sessionList = WEEK_ORDER.filter((d) => (sessions[d] ?? []).length > 0).map((d) => ({ day: d, times: sessions[d] }));
    const dayPriceEntries = Object.entries(dayPrices).filter(([, v]) => v.trim() !== "");
    const parsedDayPrices = dayPriceEntries.map(([d, v]) => [d, parseEuro(v)] as const);
    const parsedGifts = gifts.map((g) => ({ ...g, price: g.extra_price.trim() ? parseEuro(g.extra_price) : 0 }));

    const problem =
      title.trim().length < 3 ? "Indique o título da experiência." :
      description.trim().length < 20 ? "Descreva a experiência (mínimo 20 caracteres)." :
      !Number.isFinite(minutes) || minutes < 15 || minutes > 1440 ? "Indique a duração (entre 15 minutos e 24 horas)." :
      !base || base <= 0 ? "Indique um preço válido." :
      parsedDayPrices.some(([, v]) => !v || v <= 0) ? "Os preços por dia têm de ser valores válidos." :
      !Number.isInteger(min) || min < 1 || !Number.isInteger(max) || max < min || max > 200 ? "O número de pessoas não é válido (mínimo ≥ 1, máximo ≥ mínimo, até 200)." :
      sessionList.length === 0 ? "Adicione pelo menos uma sessão (dia e hora de início)." :
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
        duration_minutes: minutes,
        pricing_mode: pricingMode,
        base_price: base,
        day_prices: Object.fromEntries(parsedDayPrices),
        min_people: min,
        max_people: max,
        sessions: sessionList,
        keep_without_gift: keepWithoutGift,
        active,
      };
      let id = experience?.id;
      if (id) {
        const { error } = await supabase.from("farm_experiences").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("farm_experiences").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      // Brindes: substitui a lista, guardando a ordem.
      const { error: delErr } = await supabase.from("experience_gifts").delete().eq("experience_id", id);
      if (delErr) throw delErr;
      const { error: giftErr } = await supabase.from("experience_gifts").insert(
        parsedGifts.map((g, i) => ({ experience_id: id!, product_id: g.product_id, extra_price: g.price ?? 0, position: i })),
      );
      if (giftErr) throw giftErr;

      toast({ title: experience ? "Experiência atualizada" : "Experiência criada" });
      onSaved();
    } catch (err) {
      toast({
        title: "Erro a guardar a experiência",
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
        <h2 className="font-medium">A experiência</h2>
        <div className="space-y-2">
          <Label htmlFor="exp-title">Título *</Label>
          <Input id="exp-title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="Ex.: Apanha da uva e almoço na quinta" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-description">Descrição *</Label>
          <Textarea
            id="exp-description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
            placeholder="O que vão fazer, de que vão falar, o que devem trazer..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-duration">Duração (minutos) *</Label>
          <Input id="exp-duration" type="number" min={15} max={1440} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} className="w-40" />
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <Label htmlFor="exp-active" className="text-sm font-medium">Experiência ativa</Label>
            <p className="text-xs text-muted-foreground">Desligada, deixa de aparecer aos clientes e não aceita reservas.</p>
          </div>
          <Switch id="exp-active" checked={active} onCheckedChange={setActive} />
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Fotografias e vídeos</h2>
        <MediaListEditor existing={existingMedia} onExistingChange={setExistingMedia} files={files} onFilesChange={setFiles} />
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Preço e participantes</h2>
        <RadioGroup value={pricingMode} onValueChange={(v) => setPricingMode(v as PricingMode)} className="gap-2 sm:grid-cols-2">
          <label htmlFor="pm-person" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50">
            <RadioGroupItem value="per_person" id="pm-person" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">Preço por pessoa</div>
              <p className="text-xs text-muted-foreground">Várias reservas podem partilhar a sessão até ao máximo de pessoas.</p>
            </div>
          </label>
          <label htmlFor="pm-group" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50">
            <RadioGroupItem value="per_group" id="pm-group" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">Preço por grupo</div>
              <p className="text-xs text-muted-foreground">Cada sessão é reservada por um só grupo.</p>
            </div>
          </label>
        </RadioGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="exp-price">Preço base (€) *</Label>
            <Input id="exp-price" inputMode="decimal" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-min">Mínimo de pessoas *</Label>
            <Input id="exp-min" type="number" min={1} value={minPeople} onChange={(e) => setMinPeople(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-max">Máximo de pessoas *</Label>
            <Input id="exp-max" type="number" min={1} max={200} value={maxPeople} onChange={(e) => setMaxPeople(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-medium">Sessões e preço por dia</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Para cada dia, indique as horas a que a experiência começa. O preço do dia é opcional: sem ele, vale o preço base.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {WEEK_ORDER.map((day) => (
            <li key={day} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
              <span className="w-24 shrink-0 pt-2 text-sm font-medium text-foreground">{DAY_LABELS[day]}</span>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {(sessions[day] ?? []).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {t}
                    <button
                      type="button"
                      onClick={() => setSessions((s) => ({ ...s, [day]: (s[day] ?? []).filter((x) => x !== t) }))}
                      aria-label={`Remover sessão das ${t}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <Input
                  type="time"
                  value={newTime[day] ?? ""}
                  onChange={(e) => setNewTime((n) => ({ ...n, [day]: e.target.value }))}
                  className="h-8 w-28"
                  aria-label={`Hora de início (${DAY_LABELS[day]})`}
                />
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => addTime(day)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Input
                inputMode="decimal"
                value={dayPrices[day] ?? ""}
                onChange={(e) => setDayPrices((p) => ({ ...p, [day]: e.target.value }))}
                placeholder="Preço do dia (€)"
                className="h-8 sm:w-36"
                aria-label={`Preço de ${DAY_LABELS[day]}`}
              />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Brindes</h2>
        <GiftListEditor
          farmerId={farmerId}
          gifts={gifts}
          onGiftsChange={setGifts}
          keepWithoutGift={keepWithoutGift}
          onKeepWithoutGiftChange={setKeepWithoutGift}
          subject="A experiência"
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar experiência
        </Button>
      </div>
    </div>
  );
};

export default ExperienceForm;
