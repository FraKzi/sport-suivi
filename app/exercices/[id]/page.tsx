import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
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
  const user = await requireUser();

  // Garde-fou : l'exo doit appartenir au programme du user (évite leak via id).
  const exo = await prisma.userExercise.findFirst({
    where: { id, program: { userId: user.id } },
  });
  if (!exo) notFound();

  const { MUSCLE_LABEL_FR, musclesFromExercise } = await import("@/lib/muscleGroups");
  const muscleGroupsLabel = musclesFromExercise(exo.primaryMuscle, exo.secondaryMuscles)
    .map((m) => MUSCLE_LABEL_FR[m])
    .join(" · ");

  const sets = await prisma.workoutSet.findMany({
    where: {
      userExerciseId: id,
      session: { userId: user.id },
      weightKg: { not: null },
      reps: { not: null },
    },
    include: { session: { select: { date: true } } },
    orderBy: { id: "asc" },
  });

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });

  return (
    <ProgressionView
      exo={{
        id: exo.id,
        name: exo.name,
        type: exo.type,
        dayNumber: exo.dayNumber,
        prescription: exo.prescription,
        description: exo.description,
        muscleGroups: muscleGroupsLabel || null,
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
