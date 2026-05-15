import type { ActivityLevel, Goal } from "@prisma/client";

/**
 * Plancher protéines = 2 g/kg sur tous les objectifs (préférence utilisateur).
 * Lipides fixés par objectif, glucides remplissent les kcal restantes.
 * - Sèche      : -20% TDEE, P 2.4 g/kg, F 0.8 g/kg
 * - Recomp     : maintien TDEE, P 2.2 g/kg, F 0.9 g/kg
 * - Prise      : +10% TDEE, P 2.0 g/kg, F 1.0 g/kg
 * - Maintien   : TDEE,        P 2.0 g/kg, F 1.0 g/kg
 */
export type MacroTargets = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export const GOAL_LABEL: Record<Goal, string> = {
  CUTTING: "Sèche",
  RECOMP: "Recomposition corporelle",
  BULKING: "Prise de masse",
  MAINTENANCE: "Maintien",
};

const RULES: Record<Goal, { kcalFactor: number; proteinPerKg: number; fatPerKg: number }> = {
  CUTTING:     { kcalFactor: 0.80, proteinPerKg: 2.4, fatPerKg: 0.8 },
  RECOMP:      { kcalFactor: 1.00, proteinPerKg: 2.2, fatPerKg: 0.9 },
  BULKING:     { kcalFactor: 1.10, proteinPerKg: 2.0, fatPerKg: 1.0 },
  MAINTENANCE: { kcalFactor: 1.00, proteinPerKg: 2.0, fatPerKg: 1.0 },
};

export function computeTargets(weightKg: number, tdee: number, goal: Goal): MacroTargets {
  const r = RULES[goal];
  const kcal = Math.round(tdee * r.kcalFactor);
  const proteinG = Math.round(weightKg * r.proteinPerKg);
  const fatG = Math.round(weightKg * r.fatPerKg);
  const remaining = kcal - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remaining / 4));
  return { kcal, proteinG, carbsG, fatG };
}

/**
 * Facteurs d'activité Mifflin-St Jeor — multiplicateur appliqué au BMR pour
 * obtenir le TDEE. Plus le niveau est élevé, plus on consomme.
 */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT:     1.375,
  MODERATE:  1.55,
  HIGH:      1.725,
  VERY_HIGH: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  SEDENTARY: "Sédentaire",
  LIGHT:     "Légèrement actif",
  MODERATE:  "Modérément actif",
  HIGH:      "Très actif",
  VERY_HIGH: "Extrêmement actif",
};

export const ACTIVITY_DESCRIPTION: Record<ActivityLevel, string> = {
  SEDENTARY: "Bureau, peu ou pas de sport",
  LIGHT:     "1-3 séances / semaine ou métier debout",
  MODERATE:  "3-5 séances / semaine",
  HIGH:      "6-7 séances / semaine ou métier physique",
  VERY_HIGH: "Sport quotidien intense + métier physique",
};

export const ACTIVITY_ORDER: ActivityLevel[] = [
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "HIGH",
  "VERY_HIGH",
];

/** BMR Mifflin-St Jeor en kcal/jour. */
export function bmrMifflin(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "MALE" | "FEMALE",
): number {
  return sex === "MALE"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

/**
 * Estimateur Mifflin-St Jeor + facteur d'activité.
 * Accepte soit un ActivityLevel, soit un facteur numérique direct (tests, valeurs custom).
 */
export function estimateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "MALE" | "FEMALE",
  activity: ActivityLevel | number,
): number {
  const factor = typeof activity === "number" ? activity : ACTIVITY_FACTORS[activity];
  return Math.round(bmrMifflin(weightKg, heightCm, age, sex) * factor);
}

// ---------- Scaling des grammages ----------

type FoodLite = {
  id: number;
  name: string;
  unit: string;
  unitGrams: number | null;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
};

type ItemLite = {
  foodId: number;
  quantity: number; // dans l'unité du Food
};

export type DominantMacro = "PROTEIN" | "CARBS" | "FAT" | "MIXED";

export function classifyFood(food: FoodLite): DominantMacro {
  const kcalP = food.proteinPer100 * 4;
  const kcalC = food.carbsPer100 * 4;
  const kcalF = food.fatPer100 * 9;
  const total = kcalP + kcalC + kcalF;
  if (total === 0) return "MIXED";
  const pP = kcalP / total;
  const pC = kcalC / total;
  const pF = kcalF / total;
  const max = Math.max(pP, pC, pF);
  // si aucun macro ne dépasse 60% des kcal → mixte (ex: lait, beurre cacahuète)
  if (max < 0.6) return "MIXED";
  if (pP === max) return "PROTEIN";
  if (pC === max) return "CARBS";
  return "FAT";
}

/** Convertit une quantité (dans l'unité du Food) en grammes équivalents. */
function toGrams(qty: number, food: FoodLite): number {
  if (food.unit === "piece" && food.unitGrams) return qty * food.unitGrams;
  return qty; // g ou ml ≈ g pour le lait
}

/** Convertit grammes → unité du Food. */
function fromGrams(g: number, food: FoodLite): number {
  if (food.unit === "piece" && food.unitGrams) return g / food.unitGrams;
  return g;
}

function macrosOf(qty: number, food: FoodLite) {
  const g = toGrams(qty, food);
  const factor = g / 100;
  return {
    kcal: food.kcalPer100 * factor,
    p: food.proteinPer100 * factor,
    c: food.carbsPer100 * factor,
    f: food.fatPer100 * factor,
  };
}

/** Arrondi sensible selon l'unité (5g pour solides, 10ml pour liquides, 0.5 pour pièces). */
function smartRound(qty: number, food: FoodLite): number {
  if (food.unit === "piece") {
    // arrondi au demi
    return Math.max(0.5, Math.round(qty * 2) / 2);
  }
  if (food.unit === "ml") {
    return Math.max(10, Math.round(qty / 10) * 10);
  }
  // solides : arrondi au 5g sauf petits items (huile/beurre cacahuète) où on garde 1g
  if (food.kcalPer100 > 600) {
    return Math.max(1, Math.round(qty));
  }
  return Math.max(5, Math.round(qty / 5) * 5);
}

/**
 * Recalcule les grammages d'un plan en fonction de nouvelles cibles macro.
 * Stratégie : facteur de mise à l'échelle par macro dominante du food.
 * Items "mixtes" suivent le facteur kcal global.
 */
export function rescalePlan(
  baseMeals: { name: string; orderIndex: number; items: (ItemLite & { food: FoodLite })[] }[],
  baseTotals: MacroTargets,
  newTargets: MacroTargets,
): { meals: typeof baseMeals; totals: MacroTargets } {
  const fK = newTargets.kcal / Math.max(1, baseTotals.kcal);
  const fP = newTargets.proteinG / Math.max(1, baseTotals.proteinG);
  const fC = newTargets.carbsG / Math.max(1, baseTotals.carbsG);
  const fF = newTargets.fatG / Math.max(1, baseTotals.fatG);

  const newMeals = baseMeals.map((meal) => ({
    ...meal,
    items: meal.items.map((item) => {
      const cls = classifyFood(item.food);
      let factor = fK;
      if (cls === "PROTEIN") factor = fP;
      else if (cls === "CARBS") factor = fC;
      else if (cls === "FAT") factor = fF;
      const newQty = smartRound(item.quantity * factor, item.food);
      return { ...item, quantity: newQty };
    }),
  }));

  // recalcule les totaux réels après arrondi
  let kcal = 0, p = 0, c = 0, f = 0;
  for (const m of newMeals) {
    for (const it of m.items) {
      const mac = macrosOf(it.quantity, it.food);
      kcal += mac.kcal;
      p += mac.p;
      c += mac.c;
      f += mac.f;
    }
  }

  return {
    meals: newMeals,
    totals: {
      kcal: Math.round(kcal),
      proteinG: Math.round(p),
      carbsG: Math.round(c),
      fatG: Math.round(f),
    },
  };
}

export function macrosForMeal(items: (ItemLite & { food: FoodLite })[]): MacroTargets {
  let kcal = 0, p = 0, c = 0, f = 0;
  for (const it of items) {
    const m = macrosOf(it.quantity, it.food);
    kcal += m.kcal;
    p += m.p;
    c += m.c;
    f += m.f;
  }
  return {
    kcal: Math.round(kcal),
    proteinG: Math.round(p),
    carbsG: Math.round(c),
    fatG: Math.round(f),
  };
}
