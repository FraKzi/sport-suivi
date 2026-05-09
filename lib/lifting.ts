/**
 * Outils de musculation : plate calculator, table %1RM, strength standards.
 */

// ============== PLATE CALCULATOR ==============

/** Disques disponibles en salle (en kg, par côté). */
export const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export const STANDARD_BARS = [
  { label: "Olympique 20 kg", value: 20 },
  { label: "Femme 15 kg", value: 15 },
  { label: "Standard 10 kg", value: 10 },
  { label: "EZ-bar 7 kg", value: 7 },
  { label: "Sans barre", value: 0 },
] as const;

export type PlateBreakdown = {
  perSide: number[]; // disques par côté, ordre décroissant
  achieved: number; // poids total réellement atteint
  exact: boolean; // true si on a hit pile la cible
};

/**
 * Décompose un poids cible en disques par côté + barre.
 * Greedy descendant. Si on dépasse, on passe au disque plus petit.
 */
export function calcPlates(
  targetKg: number,
  barWeightKg: number,
  plates: readonly number[] = STANDARD_PLATES,
): PlateBreakdown | null {
  if (targetKg < 0 || barWeightKg < 0) return null;
  if (targetKg < barWeightKg) {
    // Cible plus légère que la barre — impossible à charger
    return null;
  }

  const perSideTarget = (targetKg - barWeightKg) / 2;
  const result: number[] = [];
  let remaining = perSideTarget;

  for (const p of plates) {
    // tolérance flottante 0.001
    while (remaining >= p - 0.001) {
      result.push(p);
      remaining -= p;
    }
  }

  const achievedPerSide = result.reduce((s, p) => s + p, 0);
  const achieved = barWeightKg + achievedPerSide * 2;
  const exact = Math.abs(achieved - targetKg) < 0.01;

  return { perSide: result, achieved: Math.round(achieved * 100) / 100, exact };
}

// ============== TABLE %1RM ==============

export type PercentRow = {
  pct: number;
  weight: number;
  repsRange: string;
  goal: string;
};

export function percentTable(oneRM: number): PercentRow[] {
  if (oneRM <= 0) return [];
  const rows: { pct: number; repsRange: string; goal: string }[] = [
    { pct: 60, repsRange: "15+", goal: "Endurance" },
    { pct: 70, repsRange: "10-12", goal: "Hypertrophie" },
    { pct: 75, repsRange: "8-10", goal: "Hypertrophie" },
    { pct: 80, repsRange: "6-8", goal: "Force-hypertrophie" },
    { pct: 85, repsRange: "4-6", goal: "Force" },
    { pct: 90, repsRange: "2-4", goal: "Force max" },
    { pct: 95, repsRange: "1-2", goal: "Quasi-max" },
  ];
  return rows.map((r) => ({
    ...r,
    weight: Math.round((oneRM * r.pct) / 100 / 0.5) * 0.5, // arrondi 0.5 kg
  }));
}

// ============== STRENGTH STANDARDS ==============
// Source : Symmetric Strength / Stronger By Science (e1RM / poids de corps).
// Niveaux : Débutant / Novice / Intermédiaire / Avancé / Élite.

type StandardKey = "bench" | "squat" | "deadlift" | "ohp";

const STANDARDS_MALE: Record<StandardKey, [number, number, number, number, number]> = {
  // [Débutant, Novice, Intermédiaire, Avancé, Élite]
  bench: [0.75, 1.0, 1.25, 1.5, 2.0],
  squat: [1.0, 1.5, 1.75, 2.25, 2.75],
  deadlift: [1.25, 1.75, 2.0, 2.5, 3.0],
  ohp: [0.5, 0.7, 0.9, 1.1, 1.4],
};

const STANDARDS_FEMALE: Record<StandardKey, [number, number, number, number, number]> = {
  bench: [0.5, 0.7, 0.85, 1.0, 1.35],
  squat: [0.7, 1.0, 1.25, 1.5, 1.85],
  deadlift: [0.9, 1.2, 1.45, 1.75, 2.1],
  ohp: [0.35, 0.5, 0.65, 0.8, 1.0],
};

const LEVEL_LABELS = ["Débutant", "Novice", "Intermédiaire", "Avancé", "Élite"] as const;
export type StrengthLevel = (typeof LEVEL_LABELS)[number] | "Pré-débutant";

export type StrengthAssessment = {
  exerciseLabel: string;
  ratio: number;
  level: StrengthLevel;
  thresholds: { label: string; ratio: number; weight: number }[];
  nextLevel: { label: string; weight: number; delta: number } | null;
};

/** Détecte la catégorie standard à partir du nom de l'exercice (FR/EN). */
function matchStandard(name: string): { key: StandardKey; label: string } | null {
  const n = name.toLowerCase();
  if (n.includes("bench") || n.includes("développé couché")) {
    return { key: "bench", label: "Bench Press" };
  }
  if (n.includes("squat") && !n.includes("front")) {
    return { key: "squat", label: "Back Squat" };
  }
  if (
    n.includes("deadlift") ||
    n.includes("soulevé de terre") ||
    (n.includes("sdt") && !n.includes("roumain"))
  ) {
    return { key: "deadlift", label: "Deadlift" };
  }
  if (n.includes("overhead press") || n.includes("ohp") || n.includes("développé militaire")) {
    return { key: "ohp", label: "Overhead Press" };
  }
  return null;
}

export function assessStrength(args: {
  exerciseName: string;
  e1RM: number;
  bodyWeightKg: number;
  sex: "MALE" | "FEMALE";
}): StrengthAssessment | null {
  const match = matchStandard(args.exerciseName);
  if (!match || args.bodyWeightKg <= 0 || args.e1RM <= 0) return null;

  const standards = args.sex === "MALE" ? STANDARDS_MALE : STANDARDS_FEMALE;
  const ratios = standards[match.key];
  const ratio = args.e1RM / args.bodyWeightKg;

  let levelIdx = -1; // < débutant
  for (let i = 0; i < ratios.length; i++) {
    if (ratio >= ratios[i]) levelIdx = i;
  }
  const level: StrengthLevel = levelIdx < 0 ? "Pré-débutant" : LEVEL_LABELS[levelIdx];

  const thresholds = ratios.map((r, i) => ({
    label: LEVEL_LABELS[i],
    ratio: r,
    weight: Math.round(r * args.bodyWeightKg * 2) / 2,
  }));

  const nextIdx = levelIdx + 1;
  const nextLevel =
    nextIdx < ratios.length
      ? {
          label: LEVEL_LABELS[nextIdx],
          weight: thresholds[nextIdx].weight,
          delta: Math.max(0, thresholds[nextIdx].weight - args.e1RM),
        }
      : null;

  return { exerciseLabel: match.label, ratio, level, thresholds, nextLevel };
}
