import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTargets, rescalePlan, macrosForMeal } from "@/lib/macros";

export const dynamic = "force-dynamic";

/**
 * Renvoie le plan alimentaire ACTIF, recalculé à la volée
 * en fonction du profil utilisateur (poids + TDEE + goal).
 */
export async function GET() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  const basePlan = await prisma.mealPlan.findFirst({
    where: { isBase: true },
    include: {
      meals: {
        orderBy: { orderIndex: "asc" },
        include: { items: { include: { food: true } } },
      },
    },
  });

  if (!basePlan) {
    return NextResponse.json({ error: "Plan de base manquant — relance le seed" }, { status: 500 });
  }

  if (!profile) {
    // pas de profil → on renvoie le plan de base
    return NextResponse.json({
      profile: null,
      targets: {
        kcal: basePlan.totalKcal,
        proteinG: basePlan.totalProtein,
        carbsG: basePlan.totalCarbs,
        fatG: basePlan.totalFat,
      },
      meals: basePlan.meals.map((m) => ({
        name: m.name,
        orderIndex: m.orderIndex,
        macros: macrosForMeal(m.items),
        items: m.items.map((it) => ({
          foodId: it.foodId,
          name: it.food.name,
          unit: it.food.unit,
          quantity: it.quantity,
        })),
      })),
      isBase: true,
    });
  }

  const targets = computeTargets(profile.currentWeight, profile.tdee, profile.goal);
  const baseTotals = {
    kcal: basePlan.totalKcal,
    proteinG: basePlan.totalProtein,
    carbsG: basePlan.totalCarbs,
    fatG: basePlan.totalFat,
  };

  const baseMeals = basePlan.meals.map((m) => ({
    name: m.name,
    orderIndex: m.orderIndex,
    items: m.items.map((it) => ({
      foodId: it.foodId,
      quantity: it.quantity,
      food: it.food,
    })),
  }));

  const { meals, totals } = rescalePlan(baseMeals, baseTotals, targets);

  return NextResponse.json({
    profile: { goal: profile.goal, weight: profile.currentWeight, tdee: profile.tdee },
    targets,
    actualTotals: totals,
    meals: meals.map((m) => ({
      name: m.name,
      orderIndex: m.orderIndex,
      macros: macrosForMeal(m.items),
      items: m.items.map((it) => ({
        foodId: it.foodId,
        name: it.food.name,
        unit: it.food.unit,
        quantity: it.quantity,
      })),
    })),
    isBase: false,
  });
}
