import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MealSlot } from "@prisma/client";
import { computeTargets, rescalePlan, macrosForMeal } from "@/lib/macros";
import { ShoppingList } from "./ShoppingList";

export const dynamic = "force-dynamic";

const SLOT_ORDER: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];

export default async function CoursesPage() {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const basePlan = await prisma.mealPlan.findFirst({
    where: { userId: user.id, isBase: true },
    include: {
      meals: { include: { items: { include: { food: true } } } },
    },
  });
  const prefs = await prisma.userMealPreference.findMany({ where: { userId: user.id } });

  if (!basePlan) {
    return <p className="text-sm">Plan de base manquant. Relance le seed.</p>;
  }

  const prefBySlot = new Map(prefs.map((p) => [p.slot, p.mealId]));
  const activeMeals = SLOT_ORDER.map((slot) => {
    const prefId = prefBySlot.get(slot);
    let chosen = prefId
      ? basePlan.meals.find((m) => m.id === prefId && m.slot === slot)
      : null;
    if (!chosen) {
      chosen =
        basePlan.meals.find((m) => m.slot === slot && m.variantKey === "default") ??
        basePlan.meals.find((m) => m.slot === slot)!;
    }
    return chosen!;
  });

  let scaledMeals = activeMeals.map((m) => ({
    name: m.displayName,
    orderIndex: 0,
    items: m.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food })),
  }));

  if (profile) {
    let bk = 0, bp = 0, bc = 0, bf = 0;
    for (const m of activeMeals) {
      const mac = macrosForMeal(m.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food })));
      bk += mac.kcal; bp += mac.proteinG; bc += mac.carbsG; bf += mac.fatG;
    }
    const targets = computeTargets(profile.currentWeight, profile.tdee, profile.goal);
    const res = rescalePlan(scaledMeals, { kcal: bk, proteinG: bp, carbsG: bc, fatG: bf }, targets);
    scaledMeals = res.meals;
  }

  const aggregate = new Map<number, { foodId: number; name: string; unit: string; perDay: number }>();
  for (const m of scaledMeals) {
    for (const it of m.items) {
      const existing = aggregate.get(it.foodId);
      if (existing) {
        existing.perDay += it.quantity;
      } else {
        aggregate.set(it.foodId, {
          foodId: it.foodId,
          name: it.food.name,
          unit: it.food.unit,
          perDay: it.quantity,
        });
      }
    }
  }

  const items = [...aggregate.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const variantsByActiveSlot = activeMeals.map((m) => ({
    slot: m.slot,
    displayName: m.displayName,
  }));

  return <ShoppingList items={items} activeVariants={variantsByActiveSlot} />;
}
