import { Card, CardTitle, Badge } from "@/components/ui";
import {
  ACTIVITY_LABEL,
  ACTIVITY_FACTORS,
  GOAL_LABEL,
  computeTargets,
} from "@/lib/macros";
import type { ActivityLevel, Goal } from "@prisma/client";

type Snapshot = {
  id: number;
  date: Date;
  weightKg: number;
  activityLevel: ActivityLevel;
  tdee: number;
  goal: Goal;
};

function ymdFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Décrit ce qui a changé entre deux snapshots consécutifs. */
function diffLabels(curr: Snapshot, prev: Snapshot | undefined): string[] {
  if (!prev) return ["Initial"];
  const out: string[] = [];
  if (curr.weightKg !== prev.weightKg) {
    const delta = curr.weightKg - prev.weightKg;
    out.push(`Poids ${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`);
  }
  if (curr.activityLevel !== prev.activityLevel) {
    out.push(`Activité → ${ACTIVITY_LABEL[curr.activityLevel]}`);
  }
  if (curr.tdee !== prev.tdee) {
    const delta = curr.tdee - prev.tdee;
    out.push(`TDEE ${delta > 0 ? "+" : ""}${delta} kcal`);
  }
  if (curr.goal !== prev.goal) {
    out.push(`Objectif → ${GOAL_LABEL[curr.goal]}`);
  }
  return out;
}

export function ProfileHistory({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <Card>
        <CardTitle>Historique du profil</CardTitle>
        <p className="text-sm text-muted">
          Pas encore de snapshot. Enregistre ton profil pour démarrer l'historique.
        </p>
      </Card>
    );
  }

  // snapshots arrive trié desc — on garde l'ordre mais on calcule les diffs avec
  // le snapshot suivant dans le tableau (= précédent dans le temps).
  return (
    <Card>
      <CardTitle>Historique du profil</CardTitle>
      <p className="text-xs text-muted mb-3">
        Chaque changement de poids, niveau d'activité, TDEE ou objectif crée une
        ligne. Les cibles macro de l'époque sont reconstruites depuis ces valeurs.
      </p>
      <div className="space-y-2">
        {snapshots.map((s, i) => {
          const prev = snapshots[i + 1]; // antérieur dans le temps
          const changes = diffLabels(s, prev);
          const targets = computeTargets(s.weightKg, s.tdee, s.goal);
          return (
            <div
              key={s.id}
              className="bg-surface2 border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-medium">{ymdFr(s.date)}</div>
                <div className="flex flex-wrap gap-1">
                  {changes.map((c, idx) => (
                    <Badge key={idx} tone={c === "Initial" ? "default" : "accent"}>
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-muted">Poids</div>
                  <div className="font-medium">{s.weightKg.toFixed(1)} kg</div>
                </div>
                <div>
                  <div className="text-muted">Activité</div>
                  <div className="font-medium">
                    {ACTIVITY_LABEL[s.activityLevel]}{" "}
                    <span className="text-muted">× {ACTIVITY_FACTORS[s.activityLevel]}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted">TDEE / Objectif</div>
                  <div className="font-medium">
                    {s.tdee} kcal · {GOAL_LABEL[s.goal]}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Cible macros</div>
                  <div className="font-medium">
                    {targets.kcal} kcal · {targets.proteinG}P / {targets.carbsG}C /{" "}
                    {targets.fatG}L
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
