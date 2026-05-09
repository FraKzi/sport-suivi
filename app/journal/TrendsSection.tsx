"use client";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { Card, CardTitle, Badge } from "@/components/ui";
import {
  PERIOD_DAYS,
  PERIOD_LABEL,
  PeriodKey,
  defaultBucket,
  periodStats,
} from "@/lib/gamification";

type LogEntry = { date: string; waterMl: number; steps: number };
type WorkoutEntry = { date: string; durationMin: number | null };

type Props = {
  logs: LogEntry[];
  workouts: WorkoutEntry[];
  waterTargetMl: number;
  stepsTarget: number;
  sessionsPerWeekTarget: number;
};

const ALERT_RATIO = 0.8; // < 80% de la cible déclenche un avertissement
const COLORS = {
  water: "#5b8def",
  steps: "#e0a64a",
  sport: "#e0644a",
  target: "#3fb37f",
};

function formatBarLabel(date: string, bucketDays: number): string {
  const d = new Date(date + "T00:00:00");
  if (bucketDays === 7) {
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function StatusBadge({ avg, target }: { avg: number; target: number }) {
  if (target <= 0) return null;
  const ratio = avg / target;
  if (ratio >= 1) return <Badge tone="success">✓ Au-dessus de la cible</Badge>;
  if (ratio >= ALERT_RATIO) return <Badge tone="warning">≈ Proche de la cible</Badge>;
  return <Badge tone="warning">⚠ Sous la cible recommandée</Badge>;
}

export function TrendsSection({
  logs,
  workouts,
  waterTargetMl,
  stepsTarget,
  sessionsPerWeekTarget,
}: Props) {
  const [period, setPeriod] = useState<PeriodKey>("week");
  const days = PERIOD_DAYS[period];
  const bucketDays = defaultBucket(period);

  const stats = useMemo(
    () => periodStats(logs, workouts, days, bucketDays),
    [logs, workouts, days, bucketDays],
  );

  // Datasets pour Recharts — 1 par métrique avec le label formaté
  const waterChart = stats.bucketed.map((p) => ({
    label: formatBarLabel(p.date, bucketDays),
    valeur: Math.round(p.waterMl),
  }));
  const stepsChart = stats.bucketed.map((p) => ({
    label: formatBarLabel(p.date, bucketDays),
    valeur: Math.round(p.steps),
  }));
  const sportChart = stats.bucketed.map((p) => ({
    label: formatBarLabel(p.date, bucketDays),
    valeur: Math.round(p.sportMin),
  }));

  // Alertes intelligentes
  const alerts: { metric: string; message: string }[] = [];
  if (waterTargetMl > 0 && stats.avgWaterMl < waterTargetMl * ALERT_RATIO) {
    alerts.push({
      metric: "💧 Hydratation",
      message: `Moyenne ${(stats.avgWaterMl / 1000).toFixed(2)} L/jour vs cible ${(waterTargetMl / 1000).toFixed(2)} L. Augmente ta consommation d'eau.`,
    });
  }
  if (stepsTarget > 0 && stats.avgSteps < stepsTarget * ALERT_RATIO) {
    alerts.push({
      metric: "🚶 Activité",
      message: `Moyenne ${Math.round(stats.avgSteps).toLocaleString("fr-FR")} pas/jour vs ${stepsTarget.toLocaleString("fr-FR")}. Tu as une marge à combler côté NEAT.`,
    });
  }
  if (
    sessionsPerWeekTarget > 0 &&
    stats.sessionsPerWeek < sessionsPerWeekTarget * ALERT_RATIO
  ) {
    alerts.push({
      metric: "🏋 Entraînement",
      message: `${stats.sessionsPerWeek.toFixed(1)} séance/semaine vs ${sessionsPerWeekTarget} recommandées. Programme ta prochaine séance.`,
    });
  }

  const allGood = alerts.length === 0 && stats.daysWithAnyData > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Tendances</h2>
        <div className="flex gap-1 bg-surface2 rounded-lg p-1">
          {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPeriod(k)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                period === k
                  ? "bg-accent text-white"
                  : "text-muted hover:text-text"
              }`}
            >
              {PERIOD_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {stats.daysWithAnyData === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Aucune donnée enregistrée sur les {PERIOD_LABEL[period].toLowerCase()}. Commence par
            saisir tes pas / hydratation au-dessus pour voir tes tendances.
          </p>
        </Card>
      ) : (
        <>
          {/* Bandeau alerte/succès */}
          {alerts.length > 0 && (
            <Card className="!p-4 !border-warning/40 !bg-warning/5">
              <div className="text-sm font-medium text-warning mb-2">
                ⚠ {alerts.length} point{alerts.length > 1 ? "s" : ""} de vigilance
              </div>
              <ul className="text-sm space-y-1.5">
                {alerts.map((a, i) => (
                  <li key={i} className="text-muted">
                    <span className="text-text font-medium">{a.metric}</span> — {a.message}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {allGood && (
            <Card className="!p-4 !border-success/40 !bg-success/5">
              <div className="text-sm font-medium text-success">
                ✓ Toutes tes moyennes sont dans le vert sur cette période. Continue !
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-3">
            <TrendCard
              icon="💧"
              title="Hydratation"
              avgLabel={`${(stats.avgWaterMl / 1000).toFixed(2)} L`}
              avgSubLabel={`${bucketDays === 7 ? "moyenne hebdo" : "moyenne / jour"}`}
              target={waterTargetMl}
              avg={stats.avgWaterMl}
              data={waterChart}
              color={COLORS.water}
              targetLabel={`${(waterTargetMl / 1000).toFixed(2)} L`}
              valueFormatter={(v) => `${(v / 1000).toFixed(2)} L`}
            />
            <TrendCard
              icon="🚶"
              title="Pas"
              avgLabel={Math.round(stats.avgSteps).toLocaleString("fr-FR")}
              avgSubLabel={`${bucketDays === 7 ? "moyenne hebdo" : "moyenne / jour"}`}
              target={stepsTarget}
              avg={stats.avgSteps}
              data={stepsChart}
              color={COLORS.steps}
              targetLabel={stepsTarget.toLocaleString("fr-FR")}
              valueFormatter={(v) => v.toLocaleString("fr-FR")}
            />
            <TrendCard
              icon="🏋"
              title="Entraînement"
              avgLabel={stats.sessionsPerWeek.toFixed(1)}
              avgSubLabel="séance / semaine"
              target={sessionsPerWeekTarget}
              avg={stats.sessionsPerWeek}
              data={sportChart}
              color={COLORS.sport}
              targetLabel={`${sessionsPerWeekTarget} sessions/sem`}
              valueFormatter={(v) => `${v} min`}
              compareWeekly
            />
          </div>
        </>
      )}
    </div>
  );
}

function TrendCard({
  icon,
  title,
  avgLabel,
  avgSubLabel,
  target,
  avg,
  data,
  color,
  targetLabel,
  valueFormatter,
  compareWeekly,
}: {
  icon: string;
  title: string;
  avgLabel: string;
  avgSubLabel: string;
  target: number;
  avg: number;
  data: { label: string; valeur: number }[];
  color: string;
  targetLabel: string;
  valueFormatter: (v: number) => string;
  compareWeekly?: boolean;
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-lg" aria-hidden>
            {icon}
          </span>
          <CardTitle>{title}</CardTitle>
        </div>
        {!compareWeekly && <StatusBadge avg={avg} target={target} />}
      </div>
      <div className="mb-3">
        <div className="text-2xl font-semibold tabular-nums leading-none">{avgLabel}</div>
        <div className="text-xs text-muted mt-1">
          {avgSubLabel} · cible {targetLabel}
        </div>
      </div>
      <div className="h-28 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#272c34" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#8b91a0" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "#14171c",
                border: "1px solid #272c34",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [valueFormatter(v), title]}
              labelStyle={{ color: "#8b91a0" }}
            />
            {!compareWeekly && target > 0 && (
              <ReferenceLine
                y={target}
                stroke={COLORS.target}
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
            )}
            <Bar dataKey="valeur" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
