import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTargets } from "@/lib/macros";
import {
  generateSimplePlan,
  SIMPLE_FOODS,
  type SimpleFood,
  type SimpleFoodKey,
} from "@/lib/simplePlan";

export const dynamic = "force-dynamic";

/**
 * Régénère un meal plan SIMPLE depuis les macros cibles du profil.
 *
 * - Upsert des 13 aliments par nom (catalogue Food).
 * - Désactive l'ancien plan `isBase=true` (passe à false) — ses Meals restent en
 *   DB pour préserver l'historique des MealConsumption.
 * - Crée un nouveau MealPlan `isBase=true` avec 3 Meals (variantKey="default").
 * - Vide UserMealPreference (les anciennes préférences pointent sur des meals
 *   d'un plan désactivé — fallback "default" prendra le relais sur le nouveau plan).
 */
export async function POST() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  if (!profile) {
    return NextResponse.json(
      { error: "Profil manquant — renseigne ton profil d'abord." },
      { status: 400 },
    );
  }

  const targets = computeTargets(profile.currentWeight, profile.tdee, profile.goal);
  const generated = generateSimplePlan(targets);

  // 1) Upsert des aliments. Mappe foodKey → id réel en DB.
  const foodIdByKey = new Map<SimpleFoodKey, number>();
  for (const key of Object.keys(SIMPLE_FOODS) as SimpleFoodKey[]) {
    const f: SimpleFood = SIMPLE_FOODS[key];
    const row = await prisma.food.upsert({
      where: { name: f.name },
      update: {
        unit: f.unit,
        unitGrams: f.unitGrams ?? null,
        kcalPer100: f.kcalPer100,
        proteinPer100: f.proteinPer100,
        carbsPer100: f.carbsPer100,
        fatPer100: f.fatPer100,
      },
      create: {
        name: f.name,
        unit: f.unit,
        unitGrams: f.unitGrams ?? null,
        kcalPer100: f.kcalPer100,
        proteinPer100: f.proteinPer100,
        carbsPer100: f.carbsPer100,
        fatPer100: f.fatPer100,
      },
    });
    foodIdByKey.set(key, row.id);
  }

  // 2) Désactive tous les plans isBase existants (n'efface rien).
  await prisma.mealPlan.updateMany({
    where: { isBase: true },
    data: { isBase: false },
  });

  // 3) Vide les préférences (elles pointent sur l'ancien plan).
  await prisma.userMealPreference.deleteMany({});

  // 4) Crée le nouveau plan + meals + items en une transaction.
  const newPlan = await prisma.mealPlan.create({
    data: {
      label: `Plan simple ${new Date().toISOString().slice(0, 10)}`,
      isBase: true,
      meals: {
        create: generated.map((m) => ({
          slot: m.slot,
          variantKey: "default",
          displayName: m.displayName,
          description: "Plan simple généré depuis tes cibles macro",
          items: {
            create: m.items.map((it) => ({
              foodId: foodIdByKey.get(it.foodKey)!,
              quantity: it.quantity,
            })),
          },
        })),
      },
    },
    include: { meals: { include: { items: true } } },
  });

  return NextResponse.json({
    ok: true,
    targets,
    plan: {
      id: newPlan.id,
      label: newPlan.label,
      meals: newPlan.meals.map((m) => ({
        slot: m.slot,
        displayName: m.displayName,
        items: m.items.length,
      })),
    },
  });
}
