/**
 * Générateur de meal plan SIMPLE à partir des cibles macro.
 * Liste fixe de ~13 aliments courants, 3 repas (BF/Déj/Dîner), zéro variante.
 *
 * Algorithme par repas :
 * 1. Items fixes (1 banane, 3 œufs, 200g brocoli, 100g salade…)
 * 2. Source de lipides → quantité calculée pour atteindre la cible F du repas
 * 3. Source de protéines → quantité calculée en tenant compte de la P déjà fournie
 * 4. Source de glucides → quantité calculée pour boucher la cible C restante
 *
 * Les répartitions par slot sont fixées (BF 30%P/30%C/25%F, Déj 40/40/40, Dîner 30/30/35).
 */

import type { MealSlot } from "@prisma/client";
import type { MacroTargets } from "./macros";

export type SimpleFood = {
  name: string;
  unit: "g" | "ml" | "piece";
  unitGrams?: number;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
};

export const SIMPLE_FOODS = {
  avoine:        { name: "Flocons d'avoine",          unit: "g",     kcalPer100: 380, proteinPer100: 13,  carbsPer100: 60, fatPer100: 7 },
  oeufs:         { name: "Œuf entier",                unit: "piece", unitGrams: 50, kcalPer100: 155, proteinPer100: 13,  carbsPer100: 1,  fatPer100: 11 },
  skyr:          { name: "Skyr 0%",                   unit: "g",     kcalPer100: 60,  proteinPer100: 11,  carbsPer100: 4,  fatPer100: 0.2 },
  poulet:        { name: "Filet de poulet (cru)",     unit: "g",     kcalPer100: 110, proteinPer100: 23,  carbsPer100: 0,  fatPer100: 2 },
  dinde:         { name: "Escalope de dinde (crue)",  unit: "g",     kcalPer100: 110, proteinPer100: 23,  carbsPer100: 0,  fatPer100: 1.5 },
  thon:          { name: "Thon au naturel",           unit: "g",     kcalPer100: 115, proteinPer100: 26,  carbsPer100: 0,  fatPer100: 1 },
  riz:           { name: "Riz blanc (cru)",           unit: "g",     kcalPer100: 350, proteinPer100: 7,   carbsPer100: 78, fatPer100: 0.5 },
  patateDouce:   { name: "Patate douce (crue)",       unit: "g",     kcalPer100: 86,  proteinPer100: 1.6, carbsPer100: 20, fatPer100: 0.1 },
  banane:        { name: "Banane",                    unit: "piece", unitGrams: 120, kcalPer100: 89,  proteinPer100: 1.1, carbsPer100: 23, fatPer100: 0.3 },
  brocoli:       { name: "Brocoli",                   unit: "g",     kcalPer100: 34,  proteinPer100: 2.8, carbsPer100: 7,  fatPer100: 0.4 },
  salade:        { name: "Salade verte",              unit: "g",     kcalPer100: 15,  proteinPer100: 1.4, carbsPer100: 3,  fatPer100: 0.2 },
  huileOlive:    { name: "Huile d'olive",             unit: "ml",    kcalPer100: 884, proteinPer100: 0,   carbsPer100: 0,  fatPer100: 100 },
  amandes:       { name: "Amandes",                   unit: "g",     kcalPer100: 580, proteinPer100: 21,  carbsPer100: 22, fatPer100: 50 },
  // ---- Assaisonnements & dessert (anti-fadeur) ----
  chocolatNoir:  { name: "Chocolat noir 85%",         unit: "g",     kcalPer100: 600, proteinPer100: 9,   carbsPer100: 14, fatPer100: 50 },
  sauceSoja:     { name: "Sauce soja",                unit: "ml",    kcalPer100: 50,  proteinPer100: 5,   carbsPer100: 5,  fatPer100: 0 },
  moutarde:      { name: "Moutarde de Dijon",         unit: "g",     kcalPer100: 80,  proteinPer100: 8,   carbsPer100: 4,  fatPer100: 4 },
  citron:        { name: "Citron",                    unit: "piece", unitGrams: 60,   kcalPer100: 17,  proteinPer100: 0.6, carbsPer100: 5,  fatPer100: 0.2 },
  cannelle:      { name: "Cannelle moulue",           unit: "g",     kcalPer100: 247, proteinPer100: 4,   carbsPer100: 80, fatPer100: 2 },
  herbes:        { name: "Herbes de Provence",        unit: "g",     kcalPer100: 250, proteinPer100: 9,   carbsPer100: 50, fatPer100: 5 },
  paprika:       { name: "Paprika fumé",              unit: "g",     kcalPer100: 280, proteinPer100: 14,  carbsPer100: 54, fatPer100: 13 },
  ail:           { name: "Ail (gousse)",              unit: "piece", unitGrams: 4,    kcalPer100: 149, proteinPer100: 6.4, carbsPer100: 33, fatPer100: 0.5 },
} satisfies Record<string, SimpleFood>;

export type SimpleFoodKey = keyof typeof SIMPLE_FOODS;

export type GeneratedItem = { foodKey: SimpleFoodKey; quantity: number };
export type GeneratedMeal = {
  slot: MealSlot;
  displayName: string;
  items: GeneratedItem[];
};

const MEAL_RATIOS: Record<MealSlot, { p: number; c: number; f: number }> = {
  BREAKFAST: { p: 0.30, c: 0.30, f: 0.25 },
  LUNCH:     { p: 0.40, c: 0.40, f: 0.40 },
  DINNER:    { p: 0.30, c: 0.30, f: 0.35 },
};

const MEAL_NAMES: Record<MealSlot, string> = {
  BREAKFAST: "Petit-déjeuner simple",
  LUNCH:     "Déjeuner simple",
  DINNER:    "Dîner simple",
};

type Template = {
  fixed: { foodKey: SimpleFoodKey; quantity: number }[];
  fatSource: SimpleFoodKey | null;
  proteinSource: SimpleFoodKey;
  carbSource: SimpleFoodKey;
};

const TEMPLATES: Record<MealSlot, Template> = {
  BREAKFAST: {
    fixed: [
      { foodKey: "banane",   quantity: 1 },
      { foodKey: "oeufs",    quantity: 3 },
      { foodKey: "cannelle", quantity: 2 },  // saupoudré sur l'avoine
    ],
    fatSource: null, // les œufs fournissent déjà ~16g F
    proteinSource: "skyr",
    carbSource: "avoine",
  },
  LUNCH: {
    fixed: [
      { foodKey: "brocoli",   quantity: 200 },
      { foodKey: "sauceSoja", quantity: 10 },  // marinade poulet / riz
      { foodKey: "ail",       quantity: 2 },   // 2 gousses
      { foodKey: "herbes",    quantity: 2 },   // sur le poulet
      { foodKey: "citron",    quantity: 0.5 }, // pressé sur le brocoli
    ],
    fatSource: "huileOlive",
    proteinSource: "poulet",
    carbSource: "riz",
  },
  DINNER: {
    fixed: [
      { foodKey: "salade",       quantity: 100 },
      { foodKey: "moutarde",     quantity: 10 },  // sauce pour la dinde
      { foodKey: "paprika",      quantity: 2 },   // sur la patate douce
      { foodKey: "chocolatNoir", quantity: 20 },  // dessert
    ],
    fatSource: "amandes",
    proteinSource: "dinde",
    carbSource: "patateDouce",
  },
};

function gramsOf(qty: number, food: SimpleFood): number {
  return food.unit === "piece" && food.unitGrams ? qty * food.unitGrams : qty;
}

function macrosOf(qty: number, food: SimpleFood) {
  const g = gramsOf(qty, food);
  const factor = g / 100;
  return {
    P: food.proteinPer100 * factor,
    C: food.carbsPer100 * factor,
    F: food.fatPer100 * factor,
  };
}

/** Quantité dans l'unité native du Food pour fournir `needed` grammes d'un macro donné. */
function qtyForMacro(needed: number, food: SimpleFood, macro: "P" | "C" | "F"): number {
  const per100 = macro === "P" ? food.proteinPer100 : macro === "C" ? food.carbsPer100 : food.fatPer100;
  if (per100 <= 0) return 0;
  const gramsPerUnit = food.unit === "piece" && food.unitGrams ? food.unitGrams : 1;
  const macroPerUnit = (per100 / 100) * gramsPerUnit;
  return Math.max(0, needed / macroPerUnit);
}

function smartRound(qty: number, food: SimpleFood): number {
  if (food.unit === "piece") return Math.max(0.5, Math.round(qty * 2) / 2);
  if (food.unit === "ml") return Math.max(5, Math.round(qty / 5) * 5);
  if (food.kcalPer100 > 600) return Math.max(1, Math.round(qty)); // huile, amandes : pas d'arrondi 5g
  return Math.max(5, Math.round(qty / 5) * 5);
}

export function generateSimplePlan(targets: MacroTargets): GeneratedMeal[] {
  const slots: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];

  return slots.map((slot) => {
    const ratio = MEAL_RATIOS[slot];
    const tmpl = TEMPLATES[slot];

    const mealTarget = {
      P: targets.proteinG * ratio.p,
      C: targets.carbsG * ratio.c,
      F: targets.fatG * ratio.f,
    };

    const items: GeneratedItem[] = [];
    const consumed = { P: 0, C: 0, F: 0 };

    const addItem = (foodKey: SimpleFoodKey, qty: number) => {
      const food = SIMPLE_FOODS[foodKey];
      const rounded = smartRound(qty, food);
      if (rounded <= 0) return;
      const m = macrosOf(rounded, food);
      consumed.P += m.P;
      consumed.C += m.C;
      consumed.F += m.F;
      items.push({ foodKey, quantity: rounded });
    };

    /** Skip si la quantité brute est sous le seuil utile (évite "5g skyr" inutile). */
    const addItemIfMeaningful = (foodKey: SimpleFoodKey, qty: number) => {
      const food = SIMPLE_FOODS[foodKey];
      const grams = food.unit === "piece" && food.unitGrams ? qty * food.unitGrams : qty;
      if (grams < 8) return; // < 8g brut = source non significative pour ce repas
      addItem(foodKey, qty);
    };

    // 1) items fixes
    for (const it of tmpl.fixed) {
      addItem(it.foodKey, it.quantity);
    }

    // 2) source de lipides : verrouille la cible F du repas
    if (tmpl.fatSource) {
      const food = SIMPLE_FOODS[tmpl.fatSource];
      const needed = mealTarget.F - consumed.F;
      addItem(tmpl.fatSource, qtyForMacro(needed, food, "F"));
    }

    // 3) Pré-estimation de la source de glucides : on a besoin de connaître la P
    //    qu'elle apportera AVANT de dimensionner la source protéine, sinon les
    //    protéines totales débordent (avoine = 13g P/100g, patate douce = 1.6g, etc.).
    const carbFood = SIMPLE_FOODS[tmpl.carbSource];
    const estimatedCarbQty = qtyForMacro(mealTarget.C - consumed.C, carbFood, "C");
    const estimatedCarbProtein = macrosOf(estimatedCarbQty, carbFood).P;

    // 4) source de protéines : tient compte de la P déjà fournie ET de celle à venir
    {
      const food = SIMPLE_FOODS[tmpl.proteinSource];
      const needed = mealTarget.P - consumed.P - estimatedCarbProtein;
      addItemIfMeaningful(tmpl.proteinSource, qtyForMacro(needed, food, "P"));
    }

    // 5) source de glucides : recalcule avec la C apportée par la source protéine
    {
      const needed = mealTarget.C - consumed.C;
      addItem(tmpl.carbSource, qtyForMacro(needed, carbFood, "C"));
    }

    return { slot, displayName: MEAL_NAMES[slot], items };
  });
}
