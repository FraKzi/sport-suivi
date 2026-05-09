"use client";
import { useMemo, useState } from "react";
import { Card, CardTitle, Badge } from "@/components/ui";
import {
  MUSCLES,
  MUSCLE_EMOJI,
  VOLUME_RECOMMENDATIONS,
  VOLUME_STATUS_COLOR,
  VOLUME_STATUS_LABEL,
  VOLUME_STATUS_TEXT,
  classifyVolume,
  parseMuscles,
  type MuscleKey,
} from "@/lib/muscleGroups";

type SetWithExo = {
  date: string; // ISO de la session
  muscleGroups: string | null;
};

type Props = { sets: SetWithExo[] };

type Period = 7 | 14;
const PERIOD_LABEL: Record<Period, string> = { 7: "7 jours", 14: "14 jours" };

export function VolumeByMuscle({ sets }: Props) {
  const [period, setPeriod] = useState<Period>(7);

  const setsPerMuscle = useMemo(() => {
    const cutoff = Date.now() - period * 86400_000;
    const counts: Record<MuscleKey, number> = MUSCLES.reduce(
      (acc, m) => ({ ...acc, [m]: 0 }),
      {} as Record<MuscleKey, number>,
    );
    for (const set of sets) {
      if (new Date(set.date).getTime() < cutoff) continue;
      const muscles = parseMuscles(set.muscleGroups);
      for (const m of muscles) counts[m]++;
    }
    return counts;
  }, [sets, period]);

  const totalSets = useMemo(
    () =>
      Object.values(setsPerMuscle).reduce((sum, n) => sum + n, 0) /
      Math.max(1, MUSCLES.length / 4), // moyenne approximative
    [setsPerMuscle],
  );

  // Trier par volume décroissant pour mettre en avant ce qui est travaillé
  const sortedMuscles = useMemo(
    () => [...MUSCLES].sort((a, b) => setsPerMuscle[b] - setsPerMuscle[a]),
    [setsPerMuscle],
  );

  // Échelle d'affichage : on cale la barre 100% sur 20 sets (haut de la cible)
  const SCALE_MAX = 20;

  const insufficient = sortedMuscles.filter((m) => setsPerMuscle[m] > 0 && setsPerMuscle[m] < VOLUME_RECOMMENDATIONS.insufficient);
  const noData = Object.values(setsPerMuscle).every((v) => v === 0);

  return (
    <Card>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <CardTitle>Volume hebdo par muscle</CardTitle>
        <div className="flex gap-1 bg-surface2 rounded-lg p-1">
          {(Object.keys(PERIOD_LABEL) as unknown as Period[])
            .map((k) => Number(k) as Period)
            .map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPeriod(k)}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  period === k ? "bg-accent text-white" : "text-muted hover:text-text"
                }`}
              >
                {PERIOD_LABEL[k]}
              </button>
            ))}
        </div>
      </div>

      {noData ? (
        <p className="text-sm text-muted">
          Aucune série loguée sur les {period} derniers jours.
        </p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {sortedMuscles.map((muscle) => {
              const sets = setsPerMuscle[muscle];
              const status = sets === 0 ? "insufficient" : classifyVolume(sets);
              const pct = Math.min(100, (sets / SCALE_MAX) * 100);
              const isZero = sets === 0;
              return (
                <li key={muscle} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm flex items-center gap-2">
                      <span aria-hidden>{MUSCLE_EMOJI[muscle]}</span>
                      <span className={isZero ? "text-muted" : ""}>{muscle}</span>
                    </span>
                    <span className="text-sm tabular-nums flex items-baseline gap-2">
                      <span className={`font-medium ${VOLUME_STATUS_TEXT[status]}`}>
                        {sets}
                      </span>
                      <span className="text-[10px] text-muted">
                        séries · {VOLUME_STATUS_LABEL[status]}
                      </span>
                    </span>
                  </div>
                  <div className="relative h-2 bg-surface2 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                        isZero ? "bg-border" : VOLUME_STATUS_COLOR[status]
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                    {/* Repères visuels : 4 (min stimulus), 10 (optimal start) */}
                    <div
                      className="absolute inset-y-0 w-px bg-muted/40"
                      style={{ left: `${(VOLUME_RECOMMENDATIONS.insufficient / SCALE_MAX) * 100}%` }}
                      title={`${VOLUME_RECOMMENDATIONS.insufficient} sets — seuil minimum`}
                    />
                    <div
                      className="absolute inset-y-0 w-px bg-muted/40"
                      style={{ left: `${(VOLUME_RECOMMENDATIONS.maintenance / SCALE_MAX) * 100}%` }}
                      title={`${VOLUME_RECOMMENDATIONS.maintenance} sets — début zone optimale`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {insufficient.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-xs text-warning flex items-baseline gap-2">
                <span>⚠</span>
                <span>
                  Sous-stimulé sur les {period} derniers jours :{" "}
                  <strong>{insufficient.join(", ")}</strong>
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted mt-3">
            Cible scientifique : <strong className="text-text">10-20 séries/semaine</strong> par
            muscle pour l'hypertrophie (Schoenfeld 2019). Les exercices polyarticulaires comptent
            sur tous les muscles ciblés.
          </p>
        </>
      )}
    </Card>
  );
}
