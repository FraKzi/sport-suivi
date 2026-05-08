import { NextResponse } from "next/server";
import { MealSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeTargets, rescalePlan, macrosForMeal } from "@/lib/macros";

export const dynamic = "force-dynamic";

const SLOT_LABEL: Record<MealSlot, string> = {
  BREAKFAST: "Petit-déjeuner",
  LUNCH: "Déjeuner",
  DINNER: "Dîner",
};
const SLOT_ORDER: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];

/**
 * Renvoie le plan alimentaire actif :
 * - Pour chaque slot, on prend la variante actuellement choisie par l'utilisateur
 *   (UserMealPreference) ou à défaut la variante "default".
 * - On scale les 3 variantes ensemble pour respecter les macros cibles.
 */
export async function GET() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  const basePlan = await prisma.mealPlan.findFirst({
    where: { isBase: true },
    include: {
      meals: {
        include: { items: { include: { food: true } } },
      },
    },
  });

  if (!basePlan) {
    return NextResponse.json({ error: "Plan de base manquant — relance le seed" }, { status: 500 });
  }

  // Toutes les variantes par slot (pour le sélecteur UI)
  const variantsBySlot: Record<MealSlot, { id: number; variantKey: string; displayName: string; description: string | null }[]> = {
    BREAKFAST: [],
    LUNCH: [],
    DINNER: [],
  };
  for (const m of basePlan.meals) {
    variantsBySlot[m.slot].push({
      id: m.id,
      variantKey: m.variantKey,
      displayName: m.displayName,
      description: m.description,
    });
  }
  for (const s of SLOT_ORDER) {
    // tri stable : "default" en tête, puis alpha
    variantsBySlot[s].sort((a, b) => {
      if (a.variantKey === "default") return -1;
      if (b.variantKey === "default") return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  // Préférences utilisateur (slot → mealId)
  const prefs = await prisma.userMealPreference.findMany();
  const prefBySlot = new Map<MealSlot, number>(prefs.map((p) => [p.slot, p.mealId]));

  // Sélection des variantes actives pour chaque slot
  const activeMeals = SLOT_ORDER.map((slot) => {
    const prefId = prefBySlot.get(slot);
    let chosen = prefId
      ? basePlan.meals.find((m) => m.id === prefId && m.slot === slot)
      : null;
    if (!chosen) {
      chosen =
        basePlan.meals.find((m) => m.slot === slot && m.variantKey === "default") ??
        basePlan.meals.find((m) => m.slot === slot);
    }
    return chosen!;
  });

  // Macros de base (somme des 3 variantes actives, sans scaling)
  let bk = 0, bp = 0, bc = 0, bf = 0;
  for (const m of activeMeals) {
    const mac = macrosForMeal(m.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food })));
    bk += mac.kcal; bp += mac.proteinG; bc += mac.carbsG; bf += mac.fatG;
  }
  const baseTotals = { kcal: bk, proteinG: bp, carbsG: bc, fatG: bf };

  if (!profile) {
    // Pas de profil → on renvoie les variantes telles quelles, sans scaling
    return NextResponse.json({
      profile: null,
      targets: baseTotals,
      actualTotals: baseTotals,
      meals: activeMeals.map((m) => ({
        slot: m.slot,
        slotLabel: SLOT_LABEL[m.slot],
        mealId: m.id,
        variantKey: m.variantKey,
        displayName: m.displayName,
        description: m.description,
        macros: macrosForMeal(m.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food }))),
        items: m.items.map((it) => ({
          foodId: it.foodId,
          name: it.food.name,
          unit: it.food.unit,
          quantity: it.quantity,
        })),
      })),
      variantsBySlot,
      isBase: true,
    });
  }

  const targets = computeTargets(profile.currentWeight, profile.tdee, profile.goal);

  const baseMealsForScaler = activeMeals.map((m, idx) => ({
    name: SLOT_LABEL[m.slot],
    orderIndex: idx,
    items: m.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food })),
  }));

  const { meals: scaledMeals, totals } = rescalePlan(baseMealsForScaler, baseTotals, targets);

  return NextResponse.json({
    profile: { goal: profile.goal, weight: profile.currentWeight, tdee: profile.tdee },
    targets,
    actualTotals: totals,
    meals: scaledMeals.map((m, idx) => {
      const active = activeMeals[idx];
      return {
        slot: active.slot,
        slotLabel: SLOT_LABEL[active.slot],
        mealId: active.id,
        variantKey: active.variantKey,
        displayName: active.displayName,
        description: active.description,
        macros: macrosForMeal(m.items),
        items: m.items.map((it) => ({
          foodId: it.foodId,
          name: it.food.name,
          unit: it.food.unit,
          quantity: it.quantity,
        })),
      };
    }),
    variantsBySlot,
    isBase: false,
  });
}
