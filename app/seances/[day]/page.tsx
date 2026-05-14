import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { SessionLogger } from "./SessionLogger";
import { computeBestVolumes } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: { day: string } }) {
  const day = Number(params.day);
  if (!day || day < 1 || day > 3) notFound();
  const user = await requireUser();

  const exos = await prisma.exercise.findMany({
    where: { dayNumber: day, archived: false },
    orderBy: { orderIndex: "asc" },
  });

  const lastSession = await prisma.workoutSession.findFirst({
    where: { userId: user.id, dayNumber: day },
    orderBy: { date: "desc" },
    include: { sets: true },
  });

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });

  // Records historiques par exercice : volume max (kg × reps) du user uniquement
  const allSets = await prisma.workoutSet.findMany({
    where: {
      session: { userId: user.id },
      exerciseId: { in: exos.map((e) => e.id) },
    },
    select: { exerciseId: true, weightKg: true, reps: true },
  });
  // exerciseId est nullable au niveau du schéma (transition vers UserExercise)
  // mais ces lignes ont toutes exerciseId non-null car on filtre par `in`
  const bestVolumes = computeBestVolumes(
    allSets.map((s) => ({ exerciseId: s.exerciseId!, weightKg: s.weightKg, reps: s.reps })),
  );

  return (
    <SessionLogger
      day={day}
      exercises={exos}
      lastSession={
        lastSession
          ? {
              date: lastSession.date.toISOString(),
              sets: lastSession.sets
                .filter((s) => s.exerciseId != null)
                .map((s) => ({
                  exerciseId: s.exerciseId!,
                  setNumber: s.setNumber,
                  weightKg: s.weightKg,
                  reps: s.reps,
                  rpe: s.rpe,
                })),
            }
          : null
      }
      defaultBodyWeight={profile?.currentWeight ?? null}
      bestVolumes={bestVolumes}
    />
  );
}
