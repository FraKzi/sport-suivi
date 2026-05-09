/**
 * Logique de gamification : streak, quêtes journalières, détection de PR.
 * Pure logique, pas de dépendance Prisma — fonctionne côté serveur ET client.
 */

export const DEFAULT_STEPS_TARGET = 8000;
export const WATER_ML_PER_KG = 35;
export const WATER_TRAINING_BONUS_ML = 500;

export function localYmd(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type SessionLite = { date: string; durationMin?: number | null };
type DailyLogLite = { date: string; steps: number; waterMl: number };

/**
 * Streak = nombre de jours consécutifs (en partant d'aujourd'hui) avec au moins
 * une activité enregistrée : séance, ou pas atteints, ou hydratation atteinte.
 *
 * Si rien n'a été fait aujourd'hui, on ne casse pas la streak (l'utilisateur a
 * encore la journée pour la valider) — on regarde à partir d'hier.
 */
export function computeStreak(
  sessions: SessionLite[],
  dailyLogs: DailyLogLite[],
  waterTargetMl: number,
  stepsTarget: number,
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessionDays = new Set(sessions.map((s) => localYmd(s.date)));
  const logByDay = new Map(dailyLogs.map((l) => [localYmd(l.date), l]));

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localYmd(d);
    const log = logByDay.get(key);
    const hasActivity =
      sessionDays.has(key) ||
      (log?.steps ?? 0) >= stepsTarget ||
      (log?.waterMl ?? 0) >= waterTargetMl;

    // Aujourd'hui pas encore fait → on ne casse pas la streak, on continue à hier
    if (i === 0 && !hasActivity) continue;

    if (hasActivity) streak++;
    else break;
  }

  return streak;
}

export type Quest = {
  id: string;
  emoji: string;
  label: string;
  done: boolean;
  progress: number;
  detail: string;
};

export function buildDailyQuests(args: {
  hasWorkout: boolean;
  todaySteps: number;
  todayWaterMl: number;
  waterTargetMl: number;
  stepsTarget: number;
}): Quest[] {
  const { hasWorkout, todaySteps, todayWaterMl, waterTargetMl, stepsTarget } = args;
  return [
    {
      id: "water",
      emoji: "💧",
      label: "Hydratation",
      done: todayWaterMl >= waterTargetMl,
      progress: waterTargetMl > 0 ? Math.min(1, todayWaterMl / waterTargetMl) : 0,
      detail: `${(todayWaterMl / 1000).toFixed(2)} / ${(waterTargetMl / 1000).toFixed(2)} L`,
    },
    {
      id: "steps",
      emoji: "🚶",
      label: "Mouvement",
      done: todaySteps >= stepsTarget,
      progress: stepsTarget > 0 ? Math.min(1, todaySteps / stepsTarget) : 0,
      detail: `${todaySteps.toLocaleString("fr-FR")} / ${stepsTarget.toLocaleString("fr-FR")} pas`,
    },
    {
      id: "workout",
      emoji: "🏋",
      label: "Entraînement",
      done: hasWorkout,
      progress: hasWorkout ? 1 : 0,
      detail: hasWorkout ? "Séance enregistrée ✓" : "Pas encore de séance",
    },
  ];
}

/** Volume max (kg × reps) historique par exerciseId. Sets sans poids/reps ignorés. */
export function computeBestVolumes(
  sets: { exerciseId: number; weightKg: number | null; reps: number | null }[],
): Record<number, number> {
  const best: Record<number, number> = {};
  for (const s of sets) {
    if (s.weightKg == null || s.reps == null) continue;
    const vol = s.weightKg * s.reps;
    if (!(s.exerciseId in best) || vol > best[s.exerciseId]) {
      best[s.exerciseId] = vol;
    }
  }
  return best;
}

export function isPR(weight: number, reps: number, currentBest: number | undefined): boolean {
  if (currentBest == null) return weight > 0 && reps > 0;
  return weight > 0 && reps > 0 && weight * reps > currentBest;
}

// ============== STATS PÉRIODIQUES (semaine / mois / année) ==============

export type PeriodKey = "week" | "month" | "year";

export const PERIOD_DAYS: Record<PeriodKey, number> = {
  week: 7,
  month: 30,
  year: 365,
};

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  week: "7 jours",
  month: "30 jours",
  year: "1 an",
};

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  waterMl: number;
  steps: number;
  sportMin: number;
};

export type PeriodStats = {
  series: DailyPoint[]; // 1 entrée par jour, 0 si pas de log
  bucketDays: number; // taille du bucket utilisé pour l'affichage agrégé
  bucketed: DailyPoint[]; // série agrégée pour le graphe
  avgWaterMl: number;
  avgSteps: number;
  avgSportMinPerDay: number;
  sessionsPerWeek: number;
  daysWithAnyData: number;
};

/**
 * Calcule les stats sur les `days` derniers jours (jour J-days+1 à J inclus).
 * `bucketDays` = nombre de jours par barre pour l'affichage (1 pour journalier, 7 pour hebdo).
 */
export function periodStats(
  logs: DailyLogLite[],
  sessions: SessionLite[],
  days: number,
  bucketDays = 1,
): PeriodStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const logByDay = new Map(logs.map((l) => [localYmd(l.date), l]));
  const sessionMinByDay = new Map<string, number>();
  for (const s of sessions) {
    const key = localYmd(s.date);
    sessionMinByDay.set(key, (sessionMinByDay.get(key) ?? 0) + (s.durationMin ?? 0));
  }

  const series: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = localYmd(d);
    const log = logByDay.get(key);
    series.push({
      date: key,
      waterMl: log?.waterMl ?? 0,
      steps: log?.steps ?? 0,
      sportMin: sessionMinByDay.get(key) ?? 0,
    });
  }

  // Agrégation pour l'affichage (1 barre = bucketDays jours)
  const bucketed: DailyPoint[] = [];
  for (let i = 0; i < series.length; i += bucketDays) {
    const slice = series.slice(i, i + bucketDays);
    const len = slice.length;
    bucketed.push({
      date: slice[0].date,
      waterMl: slice.reduce((sum, p) => sum + p.waterMl, 0) / len,
      steps: slice.reduce((sum, p) => sum + p.steps, 0) / len,
      sportMin: slice.reduce((sum, p) => sum + p.sportMin, 0) / len,
    });
  }

  // Moyennes globales (sur toute la période, jours sans data inclus)
  const avgWaterMl = series.reduce((sum, p) => sum + p.waterMl, 0) / days;
  const avgSteps = series.reduce((sum, p) => sum + p.steps, 0) / days;
  const avgSportMinPerDay = series.reduce((sum, p) => sum + p.sportMin, 0) / days;

  // Sessions/semaine sur la période
  const sessionsCount = series.filter((p) => p.sportMin > 0).length;
  const sessionsPerWeek = (sessionsCount / days) * 7;

  const daysWithAnyData = series.filter(
    (p) => p.waterMl > 0 || p.steps > 0 || p.sportMin > 0,
  ).length;

  return {
    series,
    bucketDays,
    bucketed,
    avgWaterMl,
    avgSteps,
    avgSportMinPerDay,
    sessionsPerWeek,
    daysWithAnyData,
  };
}

/** Choisit un bucket adapté à la période pour ne pas afficher 365 barres. */
export function defaultBucket(period: PeriodKey): number {
  if (period === "year") return 7; // hebdo
  return 1; // journalier
}
