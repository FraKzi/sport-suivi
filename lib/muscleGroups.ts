/**
 * Comptage du volume hebdomadaire par groupe musculaire. Travaille sur les
 * enums MuscleGroup (primaryMuscle + secondaryMuscles CSV sur UserExercise).
 * Un set sur un POLY compte +1 set sur chaque muscle ciblé (primaire + secondaires).
 */

import type { MuscleGroup } from "@prisma/client";

export type MuscleKey = MuscleGroup;

export const MUSCLE_LABEL_FR: Record<MuscleGroup, string> = {
  CHEST: "Pectoraux",
  BACK: "Dos",
  SHOULDERS: "Épaules",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  QUADS: "Quadriceps",
  HAMSTRINGS: "Ischios",
  GLUTES: "Fessiers",
  CALVES: "Mollets",
  ABS: "Abdos",
};

export const MUSCLE_EMOJI: Record<MuscleGroup, string> = {
  CHEST: "💥",
  BACK: "🎒",
  SHOULDERS: "🤸",
  BICEPS: "💪",
  TRICEPS: "💪",
  QUADS: "🦵",
  HAMSTRINGS: "🦵",
  GLUTES: "🍑",
  CALVES: "🦵",
  ABS: "🎯",
};

export const MUSCLES: MuscleGroup[] = [
  "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS",
  "QUADS", "HAMSTRINGS", "GLUTES", "CALVES", "ABS",
];

/** Convertit l'enum + CSV de secondaires en liste de muscles ciblés. */
export function musclesFromExercise(
  primary: MuscleGroup | null | undefined,
  secondaryCsv: string | null | undefined,
): MuscleGroup[] {
  const out = new Set<MuscleGroup>();
  if (primary) out.add(primary);
  if (secondaryCsv) {
    for (const m of secondaryCsv.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (MUSCLES.includes(m as MuscleGroup)) out.add(m as MuscleGroup);
    }
  }
  return [...out];
}

// ===== Recommandations volume =====
// Cible scientifique pour hypertrophie : 10-20 séries/semaine par muscle
// (Schoenfeld, Helms, Israetel)

export const VOLUME_RECOMMENDATIONS = {
  insufficient: 4, // < 4 = stimulus quasi nul
  maintenance: 10, // 4-9 = maintien
  optimal: 20, // 10-20 = optimal
  // > 20 = potentiellement excessif (recovery)
};

export type VolumeStatus = "insufficient" | "maintenance" | "optimal" | "excessive";

export function classifyVolume(sets: number): VolumeStatus {
  if (sets < VOLUME_RECOMMENDATIONS.insufficient) return "insufficient";
  if (sets < VOLUME_RECOMMENDATIONS.maintenance) return "maintenance";
  if (sets <= VOLUME_RECOMMENDATIONS.optimal) return "optimal";
  return "excessive";
}

export const VOLUME_STATUS_LABEL: Record<VolumeStatus, string> = {
  insufficient: "Insuffisant",
  maintenance: "Maintien",
  optimal: "Optimal",
  excessive: "Élevé",
};

export const VOLUME_STATUS_COLOR: Record<VolumeStatus, string> = {
  insufficient: "bg-danger",
  maintenance: "bg-warning",
  optimal: "bg-success",
  excessive: "bg-warning",
};

export const VOLUME_STATUS_TEXT: Record<VolumeStatus, string> = {
  insufficient: "text-danger",
  maintenance: "text-warning",
  optimal: "text-success",
  excessive: "text-warning",
};
