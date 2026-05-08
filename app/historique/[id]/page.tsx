import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardTitle, Badge } from "@/components/ui";
import { DeleteSessionButton } from "./DeleteSessionButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
      },
    },
  });

  if (!session) notFound();

  const byExo = session.sets.reduce<Record<number, typeof session.sets>>((acc, s) => {
    (acc[s.exerciseId] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <Link href="/historique" className="text-xs text-muted hover:text-accent">
            ← Historique
          </Link>
          <h1 className="text-2xl font-semibold mt-1">
            {new Date(session.date).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h1>
          <div className="text-xs text-muted mt-1">
            Jour {session.dayNumber}
            {session.bodyWeight ? ` · Poids ${session.bodyWeight} kg` : ""}
            {session.durationMin ? ` · ${session.durationMin} min` : ""}
          </div>
        </div>
        <DeleteSessionButton id={session.id} />
      </div>

      {session.notes && (
        <Card>
          <CardTitle>Notes</CardTitle>
          <p className="text-sm text-muted whitespace-pre-wrap">{session.notes}</p>
        </Card>
      )}

      <div className="space-y-3">
        {Object.values(byExo).map((sets) => {
          const exo = sets[0].exercise;
          return (
            <Card key={exo.id} className="!p-4">
              <div className="flex items-baseline justify-between mb-2">
                <div className="font-medium">{exo.name}</div>
                <Badge tone={exo.type === "POLY" ? "accent" : "default"}>{exo.type}</Badge>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted text-left">
                    <th className="font-normal py-1 w-8">#</th>
                    <th className="font-normal py-1">Charge</th>
                    <th className="font-normal py-1">Reps</th>
                    <th className="font-normal py-1">RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {sets.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-1.5">{s.setNumber}</td>
                      <td className="py-1.5">{s.weightKg ?? "–"} {s.weightKg ? "kg" : ""}</td>
                      <td className="py-1.5">{s.reps ?? "–"}</td>
                      <td className="py-1.5">{s.rpe ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
