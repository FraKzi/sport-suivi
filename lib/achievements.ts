/**
 * Système d'achievements (trophées) calculé à la volée à partir des données
 * existantes. Pas de table dédiée — on évalue chaque achievement sur read.
 */

import { computeStreak, localYmd } from "./gamification";

export type AchievementCategory = "milestone" | "streak" | "strength" | "volume" | "habit";

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  milestone: "Étapes",
  streak: "Régularité",
  strength: "Force",
  volume: "Volume",
  habit: "Habitudes",
};

export type Achievement = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: AchievementCategory;
  unlocked: boolean;
  progress: { current: number; target: number; unit?: string };
};

type SetLite = {
  weightKg: number | null;
  reps: number | null;
  exerciseName: string;
};

export type ComputeInput = {
  sessions: { date: string; sets: SetLite[] }[];
  dailyLogs: { date: string; steps: number; waterMl: number }[];
  profile: { bodyWeightKg: number; sex: "MALE" | "FEMALE" } | null;
  waterTargetMl: number;
  stepsTarget: number;
};

function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

function matchExo(name: string, keywords: string[]): boolean {
  const n = name.toLowerCase();
  return keywords.some((k) => n.includes(k));
}

export function computeAchievements(input: ComputeInput): Achievement[] {
  const { sessions, dailyLogs, profile, waterTargetMl, stepsTarget } = input;

  // --- Pré-calculs ---
  const totalSessions = sessions.length;

  let totalSets = 0;
  let totalTonnage = 0;
  let maxWeightEver = 0;
  const e1RMbyExo = new Map<string, number>();
  let prsInSingleSession = 0;

  // Pour PRs dans une session, on parcourt chronologiquement et compare aux bests précédents
  const sortedSessions = [...sessions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const runningMaxE1 = new Map<string, number>();
  for (const s of sortedSessions) {
    const sessionPRs = new Set<string>();
    for (const set of s.sets) {
      if (set.weightKg == null || set.reps == null) continue;
      totalSets++;
      const vol = set.weightKg * set.reps;
      totalTonnage += vol;
      if (set.weightKg > maxWeightEver) maxWeightEver = set.weightKg;
      const e1 = epley(set.weightKg, set.reps);
      const prev = runningMaxE1.get(set.exerciseName) ?? 0;
      if (e1 > prev) {
        runningMaxE1.set(set.exerciseName, e1);
        sessionPRs.add(set.exerciseName);
      }
    }
    if (sessionPRs.size > prsInSingleSession) {
      prsInSingleSession = sessionPRs.size;
    }
  }
  // Snapshot final des e1RMs par exo
  for (const [k, v] of runningMaxE1) e1RMbyExo.set(k, v);

  // Streak
  const streak = computeStreak(
    sessions.map((s) => ({ date: s.date })),
    dailyLogs,
    waterTargetMl,
    stepsTarget,
  );

  // Triple objectif jours (workout + steps + water tous validés le même jour)
  const sessionDays = new Set(sessions.map((s) => localYmd(s.date)));
  let tripleObjDays = 0;
  for (const log of dailyLogs) {
    const key = localYmd(log.date);
    const hasWorkout = sessionDays.has(key);
    const hitSteps = log.steps >= stepsTarget;
    const hitWater = log.waterMl >= waterTargetMl;
    if (hasWorkout && hitSteps && hitWater) tripleObjDays++;
  }

  // Hydratation jours réussis
  const waterHitDays = dailyLogs.filter((l) => l.waterMl >= waterTargetMl).length;
  const stepsHitDays = dailyLogs.filter((l) => l.steps >= stepsTarget).length;

  // e1RMs des big 4 vs poids de corps
  function maxE1RMfor(keywords: string[]): number {
    let max = 0;
    for (const [name, e1] of e1RMbyExo) {
      if (matchExo(name, keywords) && e1 > max) max = e1;
    }
    return max;
  }
  const benchE1 = maxE1RMfor(["bench", "développé couché"]);
  const squatE1 = maxE1RMfor(["squat"]);
  const dlE1 = maxE1RMfor(["deadlift", "soulevé de terre"]);
  const ohpE1 = maxE1RMfor(["overhead", "ohp", "développé militaire"]);

  const bw = profile?.bodyWeightKg ?? 0;

  // --- Définitions ---
  const make = (
    id: string,
    emoji: string,
    name: string,
    description: string,
    category: AchievementCategory,
    current: number,
    target: number,
    unit?: string,
  ): Achievement => ({
    id,
    emoji,
    name,
    description,
    category,
    unlocked: current >= target,
    progress: { current: Math.min(current, target * 2), target, unit },
  });

  const list: Achievement[] = [
    // === Étapes (milestones séances) ===
    make("first-session", "🎬", "Premier pas", "Logger ta première séance", "milestone", totalSessions, 1, "séance"),
    make("ten-sessions", "🎯", "Régulier", "10 séances loguées", "milestone", totalSessions, 10, "séances"),
    make("fifty-sessions", "🏅", "Habitué", "50 séances loguées", "milestone", totalSessions, 50, "séances"),
    make("hundred-sessions", "💎", "Vétéran", "100 séances loguées", "milestone", totalSessions, 100, "séances"),

    // === Régularité (streaks) ===
    make("streak-3", "🌱", "Premiers pas", "Streak de 3 jours d'activité", "streak", streak, 3, "j"),
    make("streak-7", "💪", "Une semaine !", "Streak de 7 jours", "streak", streak, 7, "j"),
    make("streak-30", "🔥", "Habit installé", "Streak de 30 jours", "streak", streak, 30, "j"),
    make("streak-100", "🌟", "Inarrêtable", "Streak de 100 jours", "streak", streak, 100, "j"),

    // === Force (charges + ratios poids de corps) ===
    make("first-50kg", "🏋", "Première barre", "50 kg soulevés (n'importe quel exo)", "strength", maxWeightEver, 50, "kg"),
    make("first-100kg", "💯", "Club des 100 kg", "100 kg soulevés", "strength", maxWeightEver, 100, "kg"),
    make("first-150kg", "🦍", "Club des 150 kg", "150 kg soulevés", "strength", maxWeightEver, 150, "kg"),
    ...(profile && bw > 0
      ? [
          make("bench-1bw", "🥇", "Bench 1× PdC", `Développé couché à ${Math.round(bw)} kg`, "strength", benchE1, bw, "kg e1RM"),
          make("squat-1_5bw", "🦵", "Squat 1.5× PdC", `Squat à ${Math.round(bw * 1.5)} kg`, "strength", squatE1, bw * 1.5, "kg e1RM"),
          make("dl-2bw", "🏆", "SDT 2× PdC", `Soulevé de terre à ${Math.round(bw * 2)} kg`, "strength", dlE1, bw * 2, "kg e1RM"),
          make("ohp-0_7bw", "🤸", "OHP 0.7× PdC", `Overhead press à ${Math.round(bw * 0.7)} kg`, "strength", ohpE1, bw * 0.7, "kg e1RM"),
        ]
      : []),

    // === Volume (tonnage cumulé + PRs) ===
    make("tonnage-1k", "📊", "Tonnage 1 t", "1 000 kg cumulés", "volume", totalTonnage, 1000, "kg"),
    make("tonnage-10k", "🏗", "Tonnage 10 t", "10 000 kg cumulés", "volume", totalTonnage, 10000, "kg"),
    make("tonnage-100k", "🏛", "Tonnage 100 t", "100 000 kg cumulés", "volume", totalTonnage, 100000, "kg"),
    make("sets-100", "🔢", "100 séries", "100 séries renseignées", "volume", totalSets, 100, "séries"),
    make("triple-pr", "⭐", "Pluie de PRs", "3 PRs dans une seule séance", "volume", prsInSingleSession, 3, "PRs"),

    // === Habitudes ===
    make("water-1d", "💧", "Hydraté", "Atteindre l'objectif d'hydratation 1 jour", "habit", waterHitDays, 1, "j"),
    make("water-7d", "🌊", "Hydraté 7 jours", "Atteindre l'objectif 7 jours", "habit", waterHitDays, 7, "j"),
    make("steps-1d", "🚶", "Marcheur", "Atteindre l'objectif de pas 1 jour", "habit", stepsHitDays, 1, "j"),
    make("steps-30d", "🥾", "30 jours actif", "Atteindre l'objectif de pas 30 jours", "habit", stepsHitDays, 30, "j"),
    make("triple-1d", "✅", "Triple objectif", "Sport + pas + eau le même jour", "habit", tripleObjDays, 1, "j"),
    make("triple-7d", "🎉", "Triple × 7", "Triple objectif 7 jours", "habit", tripleObjDays, 7, "j"),
  ];

  return list;
}
