/**
 * Mapping muscle canonique → mots-clés pour parser le texte `muscleGroups`
 * d'un Exercise. Pour chaque set d'un exo, on incrémente le compteur de
 * chaque muscle mentionné (compound lift = +1 set sur chaque muscle).
 */

export type MuscleKey =
  | "Pecs"
  | "Dos"
  | "Épaules"
  | "Biceps"
  | "Triceps"
  | "Quadriceps"
  | "Ischios"
  | "Fessiers"
  | "Mollets"
  | "Abdos";

const MUSCLE_KEYWORDS: Record<MuscleKey, string[]> = {
  Pecs: ["pec", "poitrine"],
  Dos: ["dos", "lat ", "lats", "(lats)", "dorsal", "trapèz"],
  Épaules: ["épaul", "delto"],
  Biceps: ["bicep"],
  Triceps: ["tricep"],
  Quadriceps: ["quad"],
  Ischios: ["ischio", "hamstring"],
  Fessiers: ["fessier", "glute"],
  Mollets: ["mollet", "calf"],
  Abdos: ["abdo", "abs", "gainage"],
};

export const MUSCLE_EMOJI: Record<MuscleKey, string> = {
  Pecs: "💥",
  Dos: "🎒",
  Épaules: "🤸",
  Biceps: "💪",
  Triceps: "💪",
  Quadriceps: "🦵",
  Ischios: "🦵",
  Fessiers: "🍑",
  Mollets: "🦵",
  Abdos: "🎯",
};

export const MUSCLES: MuscleKey[] = Object.keys(MUSCLE_KEYWORDS) as MuscleKey[];

export function parseMuscles(text: string | null | undefined): MuscleKey[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set<MuscleKey>();
  for (const muscle of MUSCLES) {
    const keywords = MUSCLE_KEYWORDS[muscle];
    if (keywords.some((kw) => lower.includes(kw))) {
      found.add(muscle);
    }
  }
  return [...found];
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
