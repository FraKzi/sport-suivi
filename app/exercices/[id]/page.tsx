import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProgressionView } from "./ProgressionView";

export const dynamic = "force-dynamic";

export default async function ExerciseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const exo = await prisma.exercise.findUnique({ where: { id } });
  if (!exo) notFound();

  // Tous les sets historiques (poids + reps requis pour les calculs)
  const sets = await prisma.workoutSet.findMany({
    where: {
      exerciseId: id,
      weightKg: { not: null },
      reps: { not: null },
    },
    include: { session: { select: { date: true } } },
    orderBy: { id: "asc" },
  });

  // Profil pour les standards de force (ratio e1RM / poids de corps)
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });

  return (
    <ProgressionView
      exo={{
        id: exo.id,
        name: exo.name,
        type: exo.type,
        dayNumber: exo.dayNumber,
        prescription: exo.prescription,
        description: exo.description,
        muscleGroups: exo.muscleGroups,
        archived: exo.archived,
      }}
      sets={sets.map((s) => ({
        weightKg: s.weightKg!,
        reps: s.reps!,
        rpe: s.rpe,
        date: s.session.date.toISOString(),
        setNumber: s.setNumber,
      }))}
      profile={
        profile
          ? { sex: profile.sex, bodyWeightKg: profile.currentWeight }
          : null
      }
    />
  );
}
