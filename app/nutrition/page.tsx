import { prisma } from "@/lib/prisma";
import { Card, CardTitle, Badge } from "@/components/ui";
import { computeTargets, GOAL_LABEL, rescalePlan, macrosForMeal } from "@/lib/macros";
import { WeightLogger } from "./WeightLogger";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatQty(quantity: number, unit: string) {
  if (unit === "piece") return `${quantity % 1 === 0 ? quantity : quantity.toFixed(1)} ×`;
  if (unit === "ml") return `${Math.round(quantity)} ml`;
  return `${Math.round(quantity)} g`;
}

export default async function NutritionPage() {
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

  const weights = await prisma.weightLog.findMany({ orderBy: { date: "desc" }, take: 20 });

  if (!basePlan) {
    return <p className="text-sm">Plan de base manquant. Relance le seed.</p>;
  }

  const baseTotals = {
    kcal: basePlan.totalKcal,
    proteinG: basePlan.totalProtein,
    carbsG: basePlan.totalCarbs,
    fatG: basePlan.totalFat,
  };

  let displayMeals = basePlan.meals.map((m) => ({
    name: m.name,
    orderIndex: m.orderIndex,
    items: m.items.map((it) => ({ foodId: it.foodId, quantity: it.quantity, food: it.food })),
  }));

  let targets = baseTotals;
  let actualTotals = baseTotals;

  if (profile) {
    targets = computeTargets(profile.currentWeight, profile.tdee, profile.goal);
    const res = rescalePlan(displayMeals, baseTotals, targets);
    displayMeals = res.meals;
    actualTotals = res.totals;
  }

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
          <CardTitle>Cibles vs réalisé</CardTitle>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-normal py-1"></th>
                <th className="text-right font-normal py-1">Cible</th>
                <th className="text-right font-normal py-1">Plan</th>
                <th className="text-right font-normal py-1">Δ</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Calories", "kcal", targets.kcal, actualTotals.kcal, "kcal"],
                  ["Protéines", "proteinG", targets.proteinG, actualTotals.proteinG, "g"],
                  ["Glucides", "carbsG", targets.carbsG, actualTotals.carbsG, "g"],
                  ["Lipides", "fatG", targets.fatG, actualTotals.fatG, "g"],
                ] as const
              ).map(([label, , cible, plan, unit]) => {
                const delta = plan - cible;
                const pct = cible ? Math.round((delta / cible) * 100) : 0;
                const color = Math.abs(pct) <= 5 ? "text-success" : Math.abs(pct) <= 10 ? "text-warning" : "text-danger";
                return (
                  <tr key={label} className="border-t border-border">
                    <td className="py-1.5">{label}</td>
                    <td className="text-right py-1.5">{cible} {unit}</td>
                    <td className="text-right py-1.5">{plan} {unit}</td>
                    <td className={`text-right py-1.5 ${color}`}>
                      {delta > 0 ? "+" : ""}
                      {delta} ({pct > 0 ? "+" : ""}
                      {pct}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-2">
            Les grammages sont arrondis (5g, 10ml, ½ pièce) ce qui peut faire varier les totaux de quelques %.
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
          const mac = macrosForMeal(meal.items);
          return (
            <Card key={meal.orderIndex}>
              <div className="flex items-baseline justify-between mb-2">
                <CardTitle>{meal.name}</CardTitle>
                <span className="text-xs text-muted">
                  {mac.kcal} kcal · {mac.proteinG}P / {mac.carbsG}C / {mac.fatG}L
                </span>
              </div>
              <ul className="text-sm divide-y divide-border">
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
    </div>
  );
}
