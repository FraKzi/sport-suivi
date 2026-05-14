// Générateur de programme basé sur Eric Helms — Muscle and Strength Pyramid.
// Entrée : split (PPL_3 / UL_4 / PPL_UL_5 / PPL_6) + priorités (par muscle).
// Sortie : liste d'UserExercise à créer (avec dayNumber, orderIndex, prescription).
//
// Pyramide Helms — niveau "Volume, Intensity, Frequency" :
//  - Volume hebdomadaire/muscle :
//      MAINTENANCE  ~8  sets/sem (MV — minimum effectif)
//      MODERATE     ~12 sets/sem (MEV → MAV)
//      EMPHASIZED   ~17 sets/sem (MAV — proche MRV)
//  - Fréquence : 2× par semaine optimal pour la plupart des muscles.
//      PPL_3 = 1× (fréquence faible, donc plus de volume par session)
//      UL_4 / PPL_6 = 2× pour tous
//      PPL_UL_5 = 2× pour la plupart
//  - Intensité : POLY 65-80% 1RM (6-10 reps), ISO 60-75% (10-15 reps).
//    RIR cible : 1-3 (laisser 1-3 reps en réserve).
//  - Sets par exercice : 3-4. Plus de volume → plus d'exercices, pas plus de sets.

import type { ExerciseType, MuscleGroup, MusclePriorityLevel, SplitType } from "@prisma/client";
import { EXERCISE_CATALOG, type CatalogExercise } from "./exerciseCatalog";

export type Priorities = Partial<Record<MuscleGroup, MusclePriorityLevel>>;

export type GeneratedExercise = {
  catalogName: string;
  name: string;
  type: ExerciseType;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  dayNumber: number;
  orderIndex: number;
  prescription: string;
  description?: string;
};

export type GeneratedProgram = {
  split: SplitType;
  daysPerWeek: number;
  daysLabels: string[];
  exercises: GeneratedExercise[];
};

// ---------- Volume cible par priorité ----------

const WEEKLY_SETS_BY_PRIORITY: Record<MusclePriorityLevel, number> = {
  MAINTENANCE: 8,
  MODERATE: 12,
  EMPHASIZED: 17,
};

// Volume max par muscle/session pour éviter les sessions de 3h
const MAX_SETS_PER_MUSCLE_PER_DAY = 12;
const MAX_EXOS_PER_MUSCLE_PER_DAY: Record<MusclePriorityLevel, number> = {
  MAINTENANCE: 2,
  MODERATE: 3,
  EMPHASIZED: 3,
};

// Sets par exercice — un peu plus pour les muscles privilégiés
const SETS_PER_EXERCISE: Record<MusclePriorityLevel, number> = {
  MAINTENANCE: 3,
  MODERATE: 3,
  EMPHASIZED: 4,
};

// Reps par type d'exercice × priorité (Helms : hypertrophie = 6-15)
const REPS_RANGE: Record<ExerciseType, Record<MusclePriorityLevel, string>> = {
  POLY: {
    MAINTENANCE: "6-10",
    MODERATE: "6-10",
    EMPHASIZED: "5-8",
  },
  ISO: {
    MAINTENANCE: "10-15",
    MODERATE: "10-15",
    EMPHASIZED: "8-12",
  },
};

// ---------- Structure des splits ----------

type DayDef = {
  label: string;
  primaryMuscles: MuscleGroup[];  // muscles principaux du jour (full work)
  // muscles d'appoint : on n'ajoute que 1 petit exo (1-2 sets) — typiquement
  // les rear delts sur un Pull day ou les abdos / mollets en fin de Legs.
  accessoryMuscles?: MuscleGroup[];
};

const SPLIT_DAYS: Record<SplitType, DayDef[]> = {
  PPL_3: [
    { label: "Pull", primaryMuscles: ["BACK", "BICEPS"], accessoryMuscles: ["SHOULDERS"] }, // rear delts
    { label: "Legs", primaryMuscles: ["QUADS", "HAMSTRINGS"], accessoryMuscles: ["GLUTES", "CALVES", "ABS"] },
    { label: "Push", primaryMuscles: ["CHEST", "SHOULDERS", "TRICEPS"] },
  ],
  UL_4: [
    { label: "Upper A", primaryMuscles: ["CHEST", "BACK", "SHOULDERS"], accessoryMuscles: ["BICEPS", "TRICEPS"] },
    { label: "Lower A", primaryMuscles: ["QUADS", "HAMSTRINGS"], accessoryMuscles: ["GLUTES", "CALVES", "ABS"] },
    { label: "Upper B", primaryMuscles: ["CHEST", "BACK", "SHOULDERS"], accessoryMuscles: ["BICEPS", "TRICEPS"] },
    { label: "Lower B", primaryMuscles: ["QUADS", "HAMSTRINGS"], accessoryMuscles: ["GLUTES", "CALVES", "ABS"] },
  ],
  PPL_UL_5: [
    { label: "Pull", primaryMuscles: ["BACK", "BICEPS"], accessoryMuscles: ["SHOULDERS"] },
    { label: "Push", primaryMuscles: ["CHEST", "SHOULDERS", "TRICEPS"] },
    { label: "Legs", primaryMuscles: ["QUADS", "HAMSTRINGS"], accessoryMuscles: ["GLUTES", "CALVES", "ABS"] },
    { label: "Upper", primaryMuscles: ["CHEST", "BACK", "SHOULDERS"], accessoryMuscles: ["BICEPS", "TRICEPS"] },
    { label: "Lower", primaryMuscles: ["QUADS", "HAMSTRINGS"], accessoryMuscles: ["GLUTES", "CALVES", "ABS"] },
  ],
  PPL_6: [
    { label: "Pull A", primaryMuscles: ["BACK", "BICEPS"], accessoryMuscles: ["SHOULDERS"] },
    { label: "Push A", primaryMuscles: ["CHEST", "SHOULDERS", "TRICEPS"] },
    { label: "Legs A", primaryMuscles: ["QUADS", "HAMSTRINGS"], accessoryMuscles: ["GLUTES", "CALVES", "ABS"] },
    { label: "Pull B", primaryMuscles: ["BACK", "BICEPS"], accessoryMuscles: ["SHOULDERS"] },
    { label: "Push B", primaryMuscles: ["CHEST", "SHOULDERS", "TRICEPS"] },
    { label: "Legs B", primaryMuscles: ["QUADS", "HAMSTRINGS"], accessoryMuscles: ["GLUTES", "CALVES", "ABS"] },
  ],
};

// Si un muscle "accessoire" est en EMPHASIZED, on le promeut en primaire pour
// qu'il reçoive le volume associé. Ex: priorities[GLUTES]=EMPHASIZED sur PPL_3
// → glutes traités comme primaire le jour Legs (3 exos au lieu d'1).
function effectiveDayMuscles(
  day: DayDef,
  priorities: Priorities,
): { muscle: MuscleGroup; isAccessory: boolean }[] {
  const primaries = new Set<MuscleGroup>(day.primaryMuscles);
  const accessories = new Set<MuscleGroup>(day.accessoryMuscles ?? []);
  for (const m of [...accessories]) {
    if (priorities[m] === "EMPHASIZED") {
      primaries.add(m);
      accessories.delete(m);
    }
  }
  return [
    ...[...primaries].map((m) => ({ muscle: m, isAccessory: false })),
    ...[...accessories].map((m) => ({ muscle: m, isAccessory: true })),
  ];
}

// ---------- Calcul de fréquence par muscle ----------

function computeFrequency(split: SplitType): Record<MuscleGroup, number> {
  const freq = {
    CHEST: 0, BACK: 0, SHOULDERS: 0, BICEPS: 0, TRICEPS: 0,
    QUADS: 0, HAMSTRINGS: 0, GLUTES: 0, CALVES: 0, ABS: 0,
  } as Record<MuscleGroup, number>;
  for (const day of SPLIT_DAYS[split]) {
    for (const m of day.primaryMuscles) freq[m] += 1;
    for (const m of day.accessoryMuscles ?? []) freq[m] += 1;
  }
  return freq;
}

// ---------- Sélection d'exercices dans le catalogue ----------

// Filtre les exos du catalogue dont primaryMuscle === muscle, en mettant les
// compound en premier. Le seedExoIndex permet de varier les exos d'une session
// à l'autre (pour les splits multi-fréquence comme UL_4 et PPL_6).
function pickExercises(
  muscle: MuscleGroup,
  count: number,
  preferCompound: boolean,
  offset: number = 0,
): CatalogExercise[] {
  const pool = EXERCISE_CATALOG.filter((e) => e.primaryMuscle === muscle);
  const compound = pool.filter((e) => e.isCompound);
  const iso = pool.filter((e) => !e.isCompound);

  // Pour le 1er exo, on veut un compound (si dispo). Les suivants alternent.
  const ordered = preferCompound ? [...compound, ...iso] : [...iso, ...compound];

  // Décale le point de départ pour la variété entre jours répétés
  const rotated = ordered.length > 0
    ? [...ordered.slice(offset % ordered.length), ...ordered.slice(0, offset % ordered.length)]
    : [];
  return rotated.slice(0, count);
}

// ---------- Génération principale ----------

export function generateProgram(input: {
  split: SplitType;
  priorities: Priorities;
}): GeneratedProgram {
  const { split, priorities } = input;
  const days = SPLIT_DAYS[split];
  const freq = computeFrequency(split);
  const exercises: GeneratedExercise[] = [];

  // Tracker : combien de fois on a déjà placé un exo pour ce muscle. Sert à
  // décaler les picks (varier entre Pull A et Pull B en PPL_6 par exemple).
  const muscleSeen: Record<string, number> = {};

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const day = days[dayIdx];
    const dayNumber = dayIdx + 1;
    let orderIndex = 1;

    // Plan le travail principal de la journée (sets visés par muscle), avec
    // promotion automatique des accessoires EMPHASIZED en primaires.
    const dayPlan = effectiveDayMuscles(day, priorities).map(({ muscle, isAccessory }) => {
      const priority = priorities[muscle] ?? "MODERATE";
      const weeklySets = WEEKLY_SETS_BY_PRIORITY[priority];
      const f = Math.max(1, freq[muscle]);
      const sets = Math.min(MAX_SETS_PER_MUSCLE_PER_DAY, Math.ceil(weeklySets / f));
      return { muscle, sets, isAccessory };
    });

    for (const { muscle, sets, isAccessory } of dayPlan) {
      const priority = priorities[muscle] ?? "MODERATE";
      const setsPerExo = SETS_PER_EXERCISE[priority];
      const targetExos = Math.min(
        isAccessory ? 1 : MAX_EXOS_PER_MUSCLE_PER_DAY[priority],
        Math.max(1, Math.ceil(sets / setsPerExo)),
      );
      const offset = muscleSeen[muscle] ?? 0;
      const picked = pickExercises(muscle, targetExos, !isAccessory, offset);
      muscleSeen[muscle] = offset + picked.length;

      for (const exo of picked) {
        const reps = REPS_RANGE[exo.type][priority];
        const prescription = `${setsPerExo}×${reps}`;
        exercises.push({
          catalogName: exo.name,
          name: exo.name,
          type: exo.type,
          primaryMuscle: exo.primaryMuscle,
          secondaryMuscles: exo.secondaryMuscles ?? [],
          dayNumber,
          orderIndex: orderIndex++,
          prescription,
          description: exo.description,
        });
      }
    }
  }

  return {
    split,
    daysPerWeek: days.length,
    daysLabels: days.map((d) => d.label),
    exercises,
  };
}

// ---------- Helpers UI ----------

export const PRIORITY_LABEL: Record<MusclePriorityLevel, string> = {
  MAINTENANCE: "Maintenance",
  MODERATE: "Modérée",
  EMPHASIZED: "Privilégié",
};

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
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

export const SPLIT_LABEL: Record<SplitType, string> = {
  PPL_3: "PPL (Pull / Legs / Push) — 3 jours",
  UL_4: "Upper / Lower — 4 jours",
  PPL_UL_5: "PPL + Upper / Lower — 5 jours",
  PPL_6: "PPL ×2 — 6 jours",
};

export const SPLIT_DAYS_LABELS = (split: SplitType) => SPLIT_DAYS[split].map((d) => d.label);
export const ALL_MUSCLES: MuscleGroup[] = [
  "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS",
  "QUADS", "HAMSTRINGS", "GLUTES", "CALVES", "ABS",
];
