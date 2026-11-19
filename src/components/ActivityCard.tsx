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
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/format";

interface ActivityRow {
  score: number;
  level: string;
  components: ActivityComponents;
  streak_weeks: number;
  exempt_reason: string | null;
  featured_rank: number | null;
  computed_at: string;
}

const COMPONENT_WEIGHTS: { key: "catalog" | "orders" | "chat"; weight: number }[] = [
  { key: "catalog", weight: 40 },
  { key: "orders", weight: 40 },
  { key: "chat", weight: 20 },
];

/** Pontuação de atividade do agricultor, com nível, sequência e próximas ações. */
const ActivityCard = ({ userId }: { userId: string }) => {
  const [row, setRow] = useState<ActivityRow | null | undefined>(undefined);
  const { t } = useTranslation("farmer");
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
        <h2 className="font-display text-lg font-semibold text-foreground">{t("activity.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("activity.notYet")}
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
          <h2 className="font-display text-lg font-semibold text-foreground">{t("activity.title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("activity.updated", { date: formatDate(row.computed_at, { day: "numeric", month: "long" }) })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" />
          {levelLabel(row.level)}
        </span>
      </div>

      {paused && pausedUntil ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-foreground">
          <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          {t("activity.paused", { date: formatReturnDate(pausedUntil) })}
        </p>
      ) : row.exempt_reason === "off_season" ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-secondary p-3 text-sm text-foreground">
          <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {t("activity.offSeason")}
        </p>
      ) : null}

      <div className="mt-5 grid gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <p className="font-display text-4xl font-bold text-foreground">
            {row.score}
            <span className="text-lg font-medium text-muted-foreground">/100</span>
          </p>
          <Progress value={row.score} className="mt-3 h-2" aria-label={t("activity.scoreAria")} />
          <p className="mt-2 text-xs text-muted-foreground">
            {next ? t("activity.missing", { count: next.missing, level: next.label }) : t("activity.max")}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center gap-2 text-foreground">
              <Flame className="h-4 w-4 text-coral" />
              {row.streak_weeks > 0 ? t("activity.streak", { count: row.streak_weeks }) : t("activity.noStreak")}
            </p>
            {row.featured_rank && (
              <p className="flex items-center gap-2 text-foreground">
                <Star className="h-4 w-4 fill-highlight text-coral" />
                {t("activity.featured")}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2.5">
            {COMPONENT_WEIGHTS.map(({ key, weight }) => {
              const value = row.components[key]?.score;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {t(`activity.components.${key}`)} <span className="font-normal text-muted-foreground">({weight}%)</span>
                    </span>
                    <span className="text-muted-foreground">
                      {value == null ? t("activity.noData") : `${value}/100`}
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
                {t("activity.toRise")}
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
        {t("activity.footer")}{" "}
        <Link to="/termos#ordenacao" className="text-primary underline-offset-4 hover:underline">
          {t("activity.how")}
        </Link>
      </p>
    </section>
  );
};

export default ActivityCard;
