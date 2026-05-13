import { prisma } from "@/lib/prisma";
import { MealSlot } from "@prisma/client";
import { Card, CardTitle, Badge } from "@/components/ui";
import { computeTargets, GOAL_LABEL, rescalePlan, macrosForMeal } from "@/lib/macros";
import { WeightLogger } from "./WeightLogger";
import { VariantSelector } from "./VariantSelector";
import { MealConsumedToggle } from "./MealConsumedToggle";
import { RegenerateSimplePlan } from "./RegenerateSimplePlan";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SLOT_LABEL: Record<MealSlot, string> = {
  BREAKFAST: "Petit-déjeuner",
  LUNCH: "Déjeuner",
  DINNER: "Dîner",
};
const SLOT_ORDER: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];

function formatQty(quantity: number, unit: string) {
  if (unit === "piece") return `${quantity % 1 === 0 ? quantity : quantity.toFixed(1)} ×`;
  if (unit === "ml") return `${Math.round(quantity)} ml`;
  return `${Math.round(quantity)} g`;
}

function todayUtcMidnight(): Date {
  const d = new Date();
  return new Date(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00.000Z`);
}

export default async function NutritionPage() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  const basePlan = await prisma.mealPlan.findFirst({
    where: { isBase: true },
    include: {
      meals: { include: { items: { include: { food: true } } } },
    },
  });
  const prefs = await prisma.userMealPreference.findMany();
  const weights = await prisma.weightLog.findMany({ orderBy: { date: "desc" }, take: 20 });
  const todayConsumed = await prisma.mealConsumption.findMany({
    where: { date: todayUtcMidnight() },
  });
  const consumedBySlot = new Map(todayConsumed.map((c) => [c.slot, c.mealId]));

  if (!basePlan) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        <Card>
          <p className="text-sm text-muted">
            Aucun plan alimentaire actif. Tu peux en générer un automatiquement
            à partir de tes macros, ou relancer le seed pour récupérer le plan
            complet avec variantes.
          </p>
        </Card>
        <RegenerateSimplePlan />
      </div>
    );
  }

  const variantsBySlot: Record<MealSlot, typeof basePlan.meals> = {
    BREAKFAST: [],
    LUNCH: [],
    DINNER: [],
  };
  for (const m of basePlan.meals) variantsBySlot[m.slot].push(m);
  for (const s of SLOT_ORDER) {
    variantsBySlot[s].sort((a, b) => {
      if (a.variantKey === "default") return -1;
      if (b.variantKey === "default") return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  const prefBySlot = new Map(prefs.map((p) => [p.slot, p.mealId]));

  // Sélection des variantes actives
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
    return chosen;
  });

  // Macros de base (somme des 3 variantes actives)
  let bk = 0, bp = 0, bc = 0, bf = 0;
  for (const m of activeMeals) {
    const mac = macrosForMeal(m.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food })));
    bk += mac.kcal; bp += mac.proteinG; bc += mac.carbsG; bf += mac.fatG;
  }
  const baseTotals = { kcal: bk, proteinG: bp, carbsG: bc, fatG: bf };

  let displayMeals = activeMeals.map((m, idx) => ({
    slot: m.slot,
    name: SLOT_LABEL[m.slot],
    orderIndex: idx,
    items: m.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food })),
  }));

  let targets = baseTotals;
  let actualTotals = baseTotals;

  if (profile) {
    targets = computeTargets(profile.currentWeight, profile.tdee, profile.goal);
    const res = rescalePlan(displayMeals, baseTotals, targets);
    displayMeals = res.meals.map((m, idx) => ({ ...m, slot: activeMeals[idx].slot }));
    actualTotals = res.totals;
  }

  // Macros consommées (selon les repas marqués "mangé")
  let cK = 0, cP = 0, cC = 0, cF = 0;
  for (const consumption of todayConsumed) {
    const dm = displayMeals.find((m) => m.slot === consumption.slot);
    const active = activeMeals.find((m) => m.slot === consumption.slot);
    if (dm && active && consumption.mealId === active.id) {
      const mac = macrosForMeal(dm.items);
      cK += mac.kcal; cP += mac.proteinG; cC += mac.carbsG; cF += mac.fatG;
    } else {
      const baseMeal = basePlan.meals.find((m) => m.id === consumption.mealId);
      if (baseMeal) {
        const mac = macrosForMeal(
          baseMeal.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food })),
        );
        cK += mac.kcal; cP += mac.proteinG; cC += mac.carbsG; cF += mac.fatG;
      }
    }
  }
  const consumedTotals = { kcal: cK, proteinG: cP, carbsG: cC, fatG: cF };
  const consumedMealsCount = todayConsumed.length;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        {profile && <Badge tone="accent">{GOAL_LABEL[profile.goal]}</Badge>}
      </div>

      {!profile && (
        <Card>
          <p className="text-sm text-muted">
            Plan de base affiché. Pour des grammages adaptés à ton poids et objectif,{" "}
            <Link href="/profil" className="text-accent hover:underline">
              renseigne ton profil
            </Link>
            .
          </p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
            <CardTitle>Cibles · Plan · Mangé</CardTitle>
            <Badge tone={consumedMealsCount === 3 ? "success" : "default"}>
              {consumedMealsCount}/3 repas pris
            </Badge>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-normal py-1"></th>
                <th className="text-right font-normal py-1">Cible</th>
                <th className="text-right font-normal py-1">Plan</th>
                <th className="text-right font-normal py-1">Mangé</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Calories", targets.kcal, actualTotals.kcal, consumedTotals.kcal, "kcal"],
                  ["Protéines", targets.proteinG, actualTotals.proteinG, consumedTotals.proteinG, "g"],
                  ["Glucides", targets.carbsG, actualTotals.carbsG, consumedTotals.carbsG, "g"],
                  ["Lipides", targets.fatG, actualTotals.fatG, consumedTotals.fatG, "g"],
                ] as const
              ).map(([label, cible, plan, mange, unit]) => {
                const pctEaten = cible ? (mange / cible) * 100 : 0;
                const eatenColor =
                  pctEaten >= 95 && pctEaten <= 110
                    ? "text-success"
                    : pctEaten >= 80
                    ? "text-warning"
                    : "text-muted";
                return (
                  <tr key={label} className="border-t border-border">
                    <td className="py-1.5">{label}</td>
                    <td className="text-right py-1.5 text-muted">{cible} {unit}</td>
                    <td className="text-right py-1.5 text-muted">{plan} {unit}</td>
                    <td className={`text-right py-1.5 font-medium ${eatenColor}`}>
                      {mange} {unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-2">
            Coche « Mangé » sous chaque repas pour suivre ta consommation réelle.
          </p>
        </Card>

        <Card>
          <CardTitle>Suivi du poids</CardTitle>
          <WeightLogger
            recent={weights.map((w) => ({
              id: w.id,
              date: w.date.toISOString(),
              weightKg: w.weightKg,
            }))}
          />
        </Card>
      </div>

      <div className="space-y-3">
        {displayMeals.map((meal) => {
          const slot = meal.slot;
          const active = activeMeals.find((m) => m.slot === slot)!;
          const variants = variantsBySlot[slot];
          const mac = macrosForMeal(meal.items);
          const isConsumed = consumedBySlot.get(slot) === active.id;
          return (
            <Card key={slot} className={isConsumed ? "!border-success/40" : ""}>
              <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                <CardTitle>{meal.name}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted">
                    {mac.kcal} kcal · {mac.proteinG}P / {mac.carbsG}C / {mac.fatG}L
                  </span>
                  <MealConsumedToggle
                    slot={slot}
                    mealId={active.id}
                    consumed={isConsumed}
                  />
                </div>
              </div>

              <VariantSelector
                slot={slot}
                activeId={active.id}
                variants={variants.map((v) => ({
                  id: v.id,
                  variantKey: v.variantKey,
                  displayName: v.displayName,
                  description: v.description,
                }))}
              />

              <ul className="text-sm divide-y divide-border mt-3">
                {meal.items.map((it) => (
                  <li key={it.foodId} className="py-1.5 flex items-baseline justify-between">
                    <span>{it.food.name}</span>
                    <span className="text-muted tabular-nums">
                      {formatQty(it.quantity, it.food.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <RegenerateSimplePlan />
    </div>
  );
}
