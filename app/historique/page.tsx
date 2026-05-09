import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle, Badge } from "@/components/ui";
import { ProgressionChart } from "@/components/ProgressionChart";

export const dynamic = "force-dynamic";

const DAY_TITLE: Record<number, string> = {
  1: "Pull",
  2: "Legs",
  3: "Push",
};

export default async function HistoriquePage() {
  const sessions = await prisma.workoutSession.findMany({
    orderBy: { date: "desc" },
    take: 50,
    include: { sets: { include: { exercise: true } } },
  });

  // Données pour le graphe : meilleure série par exercice par séance (max charge × reps)
  // Inclut les archivés : leurs séries passées doivent rester visibles dans la progression historique
  const allExos = await prisma.exercise.findMany({ orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] });

  const sessionsAsc = [...sessions].reverse();
  const series = allExos.map((exo) => {
    const points: { date: string; volume: number; weight: number; reps: number }[] = [];
    for (const s of sessionsAsc) {
      const exoSets = s.sets.filter((set) => set.exerciseId === exo.id && set.weightKg && set.reps);
      if (exoSets.length === 0) continue;
      const top = exoSets.reduce((a, b) =>
        (a.weightKg ?? 0) * (a.reps ?? 0) > (b.weightKg ?? 0) * (b.reps ?? 0) ? a : b
      );
      points.push({
        date: s.date.toISOString(),
        volume: (top.weightKg ?? 0) * (top.reps ?? 0),
        weight: top.weightKg ?? 0,
        reps: top.reps ?? 0,
      });
    }
    return { exoId: exo.id, name: exo.name, points };
  }).filter((s) => s.points.length > 0);

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
          <Card>
            <CardTitle>Progression — top set par exercice</CardTitle>
            <ProgressionChart series={series} />
          </Card>

          <Card>
            <CardTitle>Toutes les séances</CardTitle>
            <ul className="divide-y divide-border">
              {sessions.map((s) => {
                const exoCount = new Set(s.sets.map((x) => x.exerciseId)).size;
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
                    <Badge tone="accent">Jour {s.dayNumber} · {DAY_TITLE[s.dayNumber]}</Badge>
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
