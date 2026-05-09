import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle, Stat, Badge } from "@/components/ui";
import { computeTargets, GOAL_LABEL } from "@/lib/macros";
import { WeightChart } from "@/components/WeightChart";
import {
  buildDailyQuests,
  computeStreak,
  DEFAULT_STEPS_TARGET,
  localYmd,
  WATER_ML_PER_KG,
  WATER_TRAINING_BONUS_ML,
} from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  const weights = await prisma.weightLog.findMany({ orderBy: { date: "asc" } });
  const lastSessions = await prisma.workoutSession.findMany({
    orderBy: { date: "desc" },
    take: 5,
    include: { sets: true },
  });

  // Streak inputs : sessions récentes + dailyLogs récents
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const recentSessions = await prisma.workoutSession.findMany({
    where: { date: { gte: since } },
    select: { date: true, durationMin: true },
    orderBy: { date: "desc" },
  });
  const recentLogs = await prisma.dailyLog.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "desc" },
  });

  // Repas mangés aujourd'hui (UTC midnight)
  const todayDate = new Date();
  todayDate.setUTCHours(0, 0, 0, 0);
  const todayConsumed = await prisma.mealConsumption.count({
    where: { date: todayDate },
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

  // Aujourd'hui : combiner steps/water du log + détection séance
  const todayKey = localYmd(new Date());
  const todayLog = recentLogs.find((l) => localYmd(l.date) === todayKey);
  const todayWorkout = recentSessions.find((s) => localYmd(s.date) === todayKey) ?? null;

  const baseWaterTarget = Math.round(profile.currentWeight * WATER_ML_PER_KG);
  const waterTargetMl = baseWaterTarget + (todayWorkout ? WATER_TRAINING_BONUS_ML : 0);
  const stepsTarget = DEFAULT_STEPS_TARGET;

  const quests = buildDailyQuests({
    hasWorkout: !!todayWorkout,
    todaySteps: todayLog?.steps ?? 0,
    todayWaterMl: todayLog?.waterMl ?? 0,
    waterTargetMl,
    stepsTarget,
  });
  const questsDone = quests.filter((q) => q.done).length;
  const allDone = questsDone === quests.length;

  const streak = computeStreak(
    recentSessions.map((s) => ({ date: s.date.toISOString() })),
    recentLogs.map((l) => ({
      date: l.date.toISOString(),
      steps: l.steps,
      waterMl: l.waterMl,
    })),
    waterTargetMl,
    stepsTarget,
  );

  // Salutation contextuelle (matin / aprem / soir)
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 6 ? "Bonne nuit" : hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const name = profile.displayName?.trim();
  const greeting = name ? `${timeGreeting}, ${name} 👋` : "Tableau de bord";

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}</h1>
          {name && (
            <p className="text-xs text-muted mt-1">
              {streak >= 1
                ? `${streak} jour${streak > 1 ? "s" : ""} de streak — continue comme ça`
                : "Démarre ta streak en validant une quête aujourd'hui"}
            </p>
          )}
        </div>
        <Badge tone="accent">{GOAL_LABEL[profile.goal]}</Badge>
      </div>

      {/* Streak + Quêtes — gros bloc gamification */}
      <div className="grid md:grid-cols-[auto_1fr] gap-4">
        {/* Streak */}
        <Card className="flex flex-col items-center justify-center text-center min-w-[180px]">
          <div className="text-5xl mb-1" aria-hidden>
            {streak >= 7 ? "🔥" : streak >= 3 ? "🌟" : streak >= 1 ? "💪" : "🌱"}
          </div>
          <div className="text-4xl font-bold tabular-nums leading-none">{streak}</div>
          <div className="text-xs text-muted mt-1">
            {streak <= 1 ? "jour de streak" : "jours de streak"}
          </div>
          {streak >= 7 && (
            <div className="text-[10px] text-warning mt-2 italic">En feu, ne lâche rien !</div>
          )}
        </Card>

        {/* Quêtes du jour */}
        <Card>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <CardTitle>Quêtes du jour</CardTitle>
            {allDone ? (
              <Badge tone="success">🎉 Journée complète</Badge>
            ) : (
              <span className="text-xs text-muted tabular-nums">
                {questsDone} / {quests.length}
              </span>
            )}
          </div>
          <ul className="space-y-2.5">
            {quests.map((q) => (
              <li key={q.id} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 transition-colors ${
                    q.done ? "bg-success/20 text-success" : "bg-surface2"
                  }`}
                  aria-hidden
                >
                  {q.done ? "✓" : q.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium transition-colors ${
                      q.done ? "line-through text-muted" : ""
                    }`}
                  >
                    {q.label}
                  </div>
                  <div className="text-xs text-muted truncate">{q.detail}</div>
                </div>
                <div className="w-20 sm:w-28 bg-surface2 rounded-full h-1.5 overflow-hidden shrink-0">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      q.done ? "bg-success" : "bg-accent"
                    }`}
                    style={{ width: `${q.progress * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <Link href="/journal" className="text-xs text-accent hover:underline">
              Aller au journal →
            </Link>
            {!todayWorkout && (
              <Link href="/seances" className="text-xs text-accent hover:underline">
                Démarrer une séance →
              </Link>
            )}
          </div>
        </Card>
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
        <Stat label="Objectif kcal" value={targets!.kcal} unit="kcal" />
        <Stat
          label="Protéines cible"
          value={targets!.proteinG}
          unit="g"
        />
        <Stat
          label="Repas pris"
          value={`${todayConsumed}/3`}
          hint={todayConsumed === 3 ? "Journée complète ✓" : "aujourd'hui"}
        />
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
