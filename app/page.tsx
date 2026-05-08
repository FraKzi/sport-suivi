import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle, Stat, Badge } from "@/components/ui";
import { computeTargets, GOAL_LABEL } from "@/lib/macros";
import { WeightChart } from "@/components/WeightChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  const weights = await prisma.weightLog.findMany({ orderBy: { date: "asc" } });
  const lastSessions = await prisma.workoutSession.findMany({
    orderBy: { date: "desc" },
    take: 5,
    include: { sets: true },
  });

  const targets = profile
    ? computeTargets(profile.currentWeight, profile.tdee, profile.goal)
    : null;

  if (!profile) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardTitle>Bienvenue 👋</CardTitle>
          <p className="text-sm text-muted mb-4">
            Avant de démarrer, renseigne ton profil (âge, poids, taille, TDEE, objectif).
          </p>
          <Link
            href="/profil"
            className="inline-block bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Configurer mon profil →
          </Link>
        </Card>
      </div>
    );
  }

  const lastWeights = weights.slice(-2);
  const weightDelta =
    lastWeights.length === 2 ? lastWeights[1].weightKg - lastWeights[0].weightKg : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <Badge tone="accent">{GOAL_LABEL[profile.goal]}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Poids actuel"
          value={profile.currentWeight.toFixed(1)}
          unit="kg"
          hint={
            weightDelta !== 0
              ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg vs précédent`
              : undefined
          }
        />
        <Stat label="TDEE" value={profile.tdee} unit="kcal" />
        <Stat label="Objectif kcal" value={targets!.kcal} unit="kcal" />
        <Stat label="Protéines cible" value={targets!.proteinG} unit="g" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Évolution du poids</CardTitle>
          {weights.length === 0 ? (
            <p className="text-sm text-muted">Aucune mesure enregistrée.</p>
          ) : (
            <WeightChart data={weights.map((w) => ({ date: w.date.toISOString(), kg: w.weightKg }))} />
          )}
        </Card>

        <Card>
          <CardTitle>Macros cibles</CardTitle>
          {targets && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-surface2 rounded-lg py-3">
                <div className="text-xs text-muted">Glucides</div>
                <div className="text-xl font-semibold">{targets.carbsG} g</div>
              </div>
              <div className="text-center bg-surface2 rounded-lg py-3">
                <div className="text-xs text-muted">Protéines</div>
                <div className="text-xl font-semibold">{targets.proteinG} g</div>
              </div>
              <div className="text-center bg-surface2 rounded-lg py-3">
                <div className="text-xs text-muted">Lipides</div>
                <div className="text-xl font-semibold">{targets.fatG} g</div>
              </div>
            </div>
          )}
          <Link
            href="/nutrition"
            className="block mt-4 text-sm text-accent hover:underline"
          >
            Voir le plan alimentaire détaillé →
          </Link>
        </Card>
      </div>

      <Card>
        <CardTitle>Dernières séances</CardTitle>
        {lastSessions.length === 0 ? (
          <p className="text-sm text-muted">
            Aucune séance enregistrée.{" "}
            <Link href="/seances" className="text-accent hover:underline">
              Démarrer une séance
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {lastSessions.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between">
                <div>
                  <Link href={`/historique/${s.id}`} className="text-sm font-medium hover:text-accent">
                    {new Date(s.date).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    — Jour {s.dayNumber}
                  </Link>
                  <div className="text-xs text-muted">
                    {s.sets.length} séries{s.bodyWeight ? ` · ${s.bodyWeight} kg` : ""}
                    {s.durationMin ? ` · ${s.durationMin} min` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
