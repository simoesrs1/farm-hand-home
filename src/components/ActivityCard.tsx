import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame, PauseCircle, Snowflake, Sparkles, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  type ActivityComponents,
  formatReturnDate,
  isPaused,
  levelLabel,
  nextLevel,
  suggestedActions,
} from "@/lib/farmer-activity";

interface ActivityRow {
  score: number;
  level: string;
  components: ActivityComponents;
  streak_weeks: number;
  exempt_reason: string | null;
  featured_rank: number | null;
  computed_at: string;
}

const COMPONENT_LABELS: { key: keyof ActivityComponents; label: string; weight: number }[] = [
  { key: "catalog", label: "Catálogo e stock", weight: 40 },
  { key: "orders", label: "Resposta a encomendas", weight: 40 },
  { key: "chat", label: "Resposta no chat", weight: 20 },
];

/** Pontuação de atividade do agricultor, com nível, sequência e próximas ações. */
const ActivityCard = ({ userId }: { userId: string }) => {
  const [row, setRow] = useState<ActivityRow | null | undefined>(undefined);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: farmer } = await supabase
        .from("farmer_details")
        .select("id, paused_until")
        .eq("user_id", userId)
        .maybeSingle();
      if (!farmer) {
        if (!cancelled) setFailed(true);
        return;
      }
      const { data, error } = await supabase
        .from("farmer_activity")
        .select("score, level, components, streak_weeks, exempt_reason, featured_rank, computed_at")
        .eq("farmer_id", farmer.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setFailed(true);
        return;
      }
      setPausedUntil(farmer.paused_until);
      setRow(data ? { ...data, components: (data.components ?? {}) as ActivityComponents } : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (failed) return null;
  if (row === undefined) return <Skeleton className="mb-6 h-56 w-full rounded-2xl" />;

  if (row === null) {
    return (
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">A minha atividade</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A sua pontuação de atividade é calculada todas as manhãs. Volte amanhã para a ver.
        </p>
      </section>
    );
  }

  const next = nextLevel(row.score);
  const actions = suggestedActions(row.components);
  const paused = isPaused(pausedUntil);

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">A minha atividade</h2>
          <p className="text-xs text-muted-foreground">
            Últimos 30 dias · atualizada a{" "}
            {new Date(row.computed_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" />
          {levelLabel(row.level)}
        </span>
      </div>

      {paused && pausedUntil ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-sm text-foreground">
          <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          Em pausa até {formatReturnDate(pausedUntil)} — a pontuação está congelada e não perde posição.
        </p>
      ) : row.exempt_reason === "off_season" ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-secondary p-3 text-sm text-foreground">
          <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Nenhum produto seu está na época neste momento — a pontuação está congelada até voltar a
          ter produtos disponíveis.
        </p>
      ) : null}

      <div className="mt-5 grid gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <p className="font-display text-4xl font-bold text-foreground">
            {row.score}
            <span className="text-lg font-medium text-muted-foreground">/100</span>
          </p>
          <Progress value={row.score} className="mt-3 h-2" aria-label="Pontuação de atividade" />
          <p className="mt-2 text-xs text-muted-foreground">
            {next
              ? `Faltam ${next.missing} pontos para ${next.label}.`
              : "Está no nível máximo. Excelente trabalho!"}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center gap-2 text-foreground">
              <Flame className="h-4 w-4 text-accent" />
              {row.streak_weeks > 0
                ? `${row.streak_weeks} ${row.streak_weeks === 1 ? "semana ativa" : "semanas ativas seguidas"}`
                : "Ainda sem semanas ativas seguidas"}
            </p>
            {row.featured_rank && (
              <p className="flex items-center gap-2 text-foreground">
                <Star className="h-4 w-4 fill-accent text-accent" />
                Em destaque na página inicial
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2.5">
            {COMPONENT_LABELS.map(({ key, label, weight }) => {
              const value = row.components[key]?.score;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {label} <span className="font-normal text-muted-foreground">({weight}%)</span>
                    </span>
                    <span className="text-muted-foreground">
                      {value == null ? "Sem dados — não conta" : `${value}/100`}
                    </span>
                  </div>
                  <Progress value={value ?? 0} className="mt-1 h-1.5" />
                </div>
              );
            })}
          </div>

          {actions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Para subir no catálogo
              </p>
              <ul className="space-y-1.5">
                {actions.map((a) => (
                  <li key={a.text}>
                    <Link
                      to={a.to}
                      className="group flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="flex-1">{a.text}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Os agricultores mais ativos aparecem primeiro no catálogo e em destaque na página inicial.{" "}
        <Link to="/termos#ordenacao" className="text-primary underline-offset-4 hover:underline">
          Como funciona
        </Link>
      </p>
    </section>
  );
};

export default ActivityCard;
