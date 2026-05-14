import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardTitle, Badge } from "@/components/ui";
import { ProgressionChart } from "@/components/ProgressionChart";
import { VolumeByMuscle } from "./VolumeByMuscle";
import { CalendarHeatmap } from "./CalendarHeatmap";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const user = await requireUser();

  const program = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    select: { daysLabels: true },
  });
  const daysLabels = program ? (JSON.parse(program.daysLabels) as string[]) : [];

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 50,
    include: { sets: { include: { userExercise: true } } },
  });

  // Sets des 14 derniers jours pour le volume par muscle
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000);
  const recentSets = await prisma.workoutSet.findMany({
    where: {
      session: { userId: user.id, date: { gte: fourteenDaysAgo } },
      OR: [{ weightKg: { not: null } }, { reps: { not: null } }],
    },
    include: {
      session: { select: { date: true } },
      userExercise: { select: { primaryMuscle: true, secondaryMuscles: true } },
    },
  });
  const volumeSets = recentSets.map((s) => ({
    date: s.session.date.toISOString(),
    primaryMuscle: s.userExercise?.primaryMuscle ?? null,
    secondaryMuscles: s.userExercise?.secondaryMuscles ?? null,
  }));

  const yearAgo = new Date(Date.now() - 365 * 86400_000);
  const yearSets = await prisma.workoutSet.findMany({
    where: {
      session: { userId: user.id, date: { gte: yearAgo } },
      OR: [{ weightKg: { not: null } }, { reps: { not: null } }],
    },
    include: { session: { select: { date: true } } },
  });
  const heatmapSets = yearSets.map((s) => ({ date: s.session.date.toISOString() }));

  // Top set par UserExercise pour la progression chart — inclut archivés
  // pour conserver l'historique visible.
  const allExos = await prisma.userExercise.findMany({
    where: { program: { userId: user.id, active: true } },
    orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
  });

  const sessionsAsc = [...sessions].reverse();
  const series = allExos
    .map((exo) => {
      const points: { date: string; volume: number; weight: number; reps: number }[] = [];
      for (const s of sessionsAsc) {
        const exoSets = s.sets.filter(
          (set) => set.userExerciseId === exo.id && set.weightKg && set.reps,
        );
        if (exoSets.length === 0) continue;
        const top = exoSets.reduce((a, b) =>
          (a.weightKg ?? 0) * (a.reps ?? 0) > (b.weightKg ?? 0) * (b.reps ?? 0) ? a : b,
        );
        points.push({
          date: s.date.toISOString(),
          volume: (top.weightKg ?? 0) * (top.reps ?? 0),
          weight: top.weightKg ?? 0,
          reps: top.reps ?? 0,
        });
      }
      return { exoId: exo.id, name: exo.name, points };
    })
    .filter((s) => s.points.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Historique</h1>
        <span className="text-xs text-muted">{sessions.length} séance(s)</span>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Aucune séance enregistrée.{" "}
            <Link href="/seances" className="text-accent hover:underline">
              Démarrer ta première séance
            </Link>
          </p>
        </Card>
      ) : (
        <>
          <CalendarHeatmap sets={heatmapSets} />

          <VolumeByMuscle sets={volumeSets} />

          <Card>
            <CardTitle>Progression — top set par exercice</CardTitle>
            <ProgressionChart series={series} />
          </Card>

          <Card>
            <CardTitle>Toutes les séances</CardTitle>
            <ul className="divide-y divide-border">
              {sessions.map((s) => {
                const exoCount = new Set(s.sets.map((x) => x.userExerciseId)).size;
                const dayLabel = daysLabels[s.dayNumber - 1] ?? `Jour ${s.dayNumber}`;
                return (
                  <li key={s.id} className="py-3 flex items-center justify-between">
                    <Link href={`/historique/${s.id}`} className="block hover:text-accent">
                      <div className="text-sm font-medium">
                        {new Date(s.date).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {exoCount} exos · {s.sets.length} séries
                        {s.bodyWeight ? ` · ${s.bodyWeight} kg` : ""}
                        {s.durationMin ? ` · ${s.durationMin} min` : ""}
                      </div>
                    </Link>
                    <Badge tone="accent">{dayLabel}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
