"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, Field, Button, Badge } from "@/components/ui";
import { Ring } from "@/components/Rings";
import {
  WATER_ML_PER_KG,
  WATER_TRAINING_BONUS_ML,
  localYmd,
} from "@/lib/gamification";
import { TrendsSection } from "./TrendsSection";

type Profile = {
  weight: number;
  height: number;
  age: number;
  sex: "MALE" | "FEMALE";
  waterTargetMl?: number | null;
  stepsTarget?: number | null;
};
type LogEntry = { date: string; steps: number; waterMl: number };
type WorkoutEntry = { date: string; durationMin: number | null; dayNumber: number };

type Props = {
  profile: Profile | null;
  recentLogs: LogEntry[];
  recentWorkouts: WorkoutEntry[];
};

const KCAL_PER_STEP = 0.04;
const KCAL_PER_MIN_WORKOUT = 6;
const DEFAULT_WATER_TARGET_ML = 2500;
const DEFAULT_STEPS_TARGET_CLIENT = 8000;

function bmrMifflin(p: Profile): number {
  return p.sex === "MALE"
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
}

export function JournalClient({ profile, recentLogs, recentWorkouts }: Props) {
  const router = useRouter();
  const [today, setToday] = useState<string>("");
  const [steps, setSteps] = useState(0);
  const [stepsInput, setStepsInput] = useState("0");
  const [waterMl, setWaterMl] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const todayStr = localYmd(new Date());
    setToday(todayStr);
    const log = recentLogs.find((l) => l.date.startsWith(todayStr));
    if (log) {
      setSteps(log.steps);
      setStepsInput(String(log.steps));
      setWaterMl(log.waterMl);
    }
    setHydrated(true);
  }, [recentLogs]);

  const todayWorkoutMin = useMemo(() => {
    if (!today) return 0;
    return recentWorkouts
      .filter((w) => w.date.startsWith(today))
      .reduce((sum, w) => sum + (w.durationMin ?? 0), 0);
  }, [today, recentWorkouts]);

  const todayWorkout = useMemo(
    () => (today ? recentWorkouts.find((w) => w.date.startsWith(today)) ?? null : null),
    [today, recentWorkouts],
  );

  const bmr = profile ? Math.round(bmrMifflin(profile)) : 0;
  const stepKcal = Math.round(steps * KCAL_PER_STEP);
  const workoutKcal = Math.round(todayWorkoutMin * KCAL_PER_MIN_WORKOUT);
  const totalKcal = bmr + stepKcal + workoutKcal;

  // Override prioritaire si l'utilisateur a personnalisé sur /profil
  const baseWaterTarget = profile
    ? profile.waterTargetMl != null && profile.waterTargetMl > 0
      ? profile.waterTargetMl
      : Math.round(profile.weight * WATER_ML_PER_KG)
    : DEFAULT_WATER_TARGET_ML;
  const trainingBonus = todayWorkoutMin > 0 ? WATER_TRAINING_BONUS_ML : 0;
  const waterTarget = baseWaterTarget + trainingBonus;
  const waterPct = waterTarget > 0 ? Math.min(100, (waterMl / waterTarget) * 100) : 0;
  const waterRemaining = Math.max(0, waterTarget - waterMl);
  const waterDone = waterMl >= waterTarget;

  async function persist(updates: { steps?: number; waterMl?: number }) {
    if (!today) return;
    await fetch("/api/daily-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, ...updates }),
    });
    router.refresh();
  }

  function commitSteps(value: number) {
    const n = Math.max(0, Math.min(100000, Math.round(value)));
    setSteps(n);
    setStepsInput(String(n));
    persist({ steps: n });
  }

  function addWater(ml: number) {
    const next = Math.max(0, waterMl + ml);
    setWaterMl(next);
    persist({ waterMl: next });
  }

  function resetWater() {
    setWaterMl(0);
    persist({ waterMl: 0 });
  }

  // ---- Anneaux de progression (Apple Watch style) ----
  const stepsTarget =
    profile?.stepsTarget != null && profile.stepsTarget > 0
      ? profile.stepsTarget
      : DEFAULT_STEPS_TARGET_CLIENT;
  const stepsPct = stepsTarget > 0 ? steps / stepsTarget : 0;
  const waterPctRing = waterTarget > 0 ? waterMl / waterTarget : 0;
  const workoutMinPct = todayWorkoutMin / 50; // 50 min = 100%
  const allRingsDone = stepsPct >= 1 && waterPctRing >= 1 && workoutMinPct >= 1;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Journal du jour</h1>
        {hydrated && today && (
          <span className="text-xs text-muted">
            {new Date(today + "T00:00:00").toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        )}
      </div>

      {/* Anneaux de progression */}
      <Card>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <CardTitle>Aujourd&apos;hui</CardTitle>
          {allRingsDone && <Badge tone="success">🎉 Triple objectif atteint</Badge>}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 place-items-center">
          <Ring
            progress={waterPctRing}
            colorClass="text-accent"
            emoji="💧"
            value={`${(waterMl / 1000).toFixed(1)} L`}
            label="Hydratation"
            size={96}
          />
          <Ring
            progress={stepsPct}
            colorClass="text-warning"
            emoji="🚶"
            value={steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(steps)}
            label={`/ ${(stepsTarget / 1000).toFixed(0)}k pas`}
            size={96}
          />
          <Ring
            progress={workoutMinPct}
            colorClass="text-danger"
            emoji="🏋"
            value={`${todayWorkoutMin} min`}
            label="Sport"
            size={96}
          />
        </div>
      </Card>

      {/* Dépense calorique */}
      <Card>
        <CardTitle>Dépense calorique estimée</CardTitle>
        {!profile ? (
          <p className="text-sm text-muted">
            Renseigne ton profil pour estimer ta dépense (BMR Mifflin-St Jeor).
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-semibold tabular-nums">{totalKcal}</span>
              <span className="text-lg text-muted">kcal dépensées</span>
            </div>
            <ul className="text-sm space-y-2 border-t border-border pt-3">
              <li className="flex items-center justify-between">
                <span className="text-muted">🛌 Métabolisme de base (BMR)</span>
                <span className="tabular-nums">{bmr} kcal</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted">
                  🚶 Pas — {steps.toLocaleString("fr-FR")} × {KCAL_PER_STEP}
                </span>
                <span className="tabular-nums">+ {stepKcal} kcal</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted">
                  🏋 Sport — {todayWorkoutMin} min × {KCAL_PER_MIN_WORKOUT}
                  {todayWorkout && ` (Jour ${todayWorkout.dayNumber})`}
                </span>
                <span className="tabular-nums">+ {workoutKcal} kcal</span>
              </li>
            </ul>
            <p className="text-xs text-muted mt-3 italic">
              Estimations indicatives — la dépense réelle dépend de ton intensité, ton poids et ton métabolisme.
            </p>
          </>
        )}
      </Card>

      {/* Pas */}
      <Card>
        <CardTitle>Pas du jour</CardTitle>
        <div className="flex items-end gap-3 flex-wrap">
          <Field label="Total">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100000}
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => {
                const n = parseInt(stepsInput, 10);
                if (Number.isFinite(n)) commitSteps(n);
                else setStepsInput(String(steps));
              }}
              className="w-32"
            />
          </Field>
          <div className="flex gap-2 mb-1 flex-wrap">
            <Button variant="ghost" onClick={() => commitSteps(steps + 1000)}>
              + 1 000
            </Button>
            <Button variant="ghost" onClick={() => commitSteps(steps + 5000)}>
              + 5 000
            </Button>
            <Button variant="ghost" onClick={() => commitSteps(0)} disabled={steps === 0}>
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Hydratation */}
      <Card>
        <CardTitle>Hydratation</CardTitle>
        <div className="bg-surface2 rounded-full h-3 overflow-hidden mb-3">
          <div
            className={`h-full transition-all ${waterDone ? "bg-success" : "bg-accent"}`}
            style={{ width: `${waterPct}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <div>
            <span className="text-3xl font-semibold tabular-nums">
              {(waterMl / 1000).toFixed(2)}
            </span>
            <span className="text-muted text-sm ml-1">
              / {(waterTarget / 1000).toFixed(2)} L
            </span>
          </div>
          {waterDone ? (
            <Badge tone="success">✓ Objectif atteint</Badge>
          ) : (
            <span className="text-sm text-muted">
              Reste <strong className="text-text">{(waterRemaining / 1000).toFixed(2)} L</strong> à boire
            </span>
          )}
        </div>
        {trainingBonus > 0 && (
          <p className="text-xs text-muted italic mb-3">
            +{trainingBonus} ml ajoutés à l'objectif (jour d'entraînement détecté).
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => addWater(250)}>+ Verre&nbsp;(250 ml)</Button>
          <Button onClick={() => addWater(500)}>+ Bouteille&nbsp;(500 ml)</Button>
          <Button onClick={() => addWater(1000)}>+ Gourde&nbsp;(1 L)</Button>
          <Button variant="ghost" onClick={() => addWater(-250)} disabled={waterMl < 250}>
            − 250 ml
          </Button>
          <Button variant="danger" onClick={resetWater} disabled={waterMl === 0}>
            Reset
          </Button>
        </div>
        <p className="text-xs text-muted mt-3">
          {profile?.waterTargetMl
            ? `Objectif personnalisé (${profile.waterTargetMl} ml)`
            : `Objectif basé sur ${WATER_ML_PER_KG} ml/kg de poids${profile ? ` (${profile.weight} kg)` : ""}`}
          , +{WATER_TRAINING_BONUS_ML} ml les jours d&apos;entraînement.
        </p>
      </Card>

      <TrendsSection
        logs={recentLogs.map((l) => ({
          date: l.date,
          waterMl: l.waterMl,
          steps: l.steps,
        }))}
        workouts={recentWorkouts.map((w) => ({
          date: w.date,
          durationMin: w.durationMin,
        }))}
        waterTargetMl={baseWaterTarget}
        stepsTarget={stepsTarget}
        sessionsPerWeekTarget={3}
      />
    </div>
  );
}
