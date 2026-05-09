import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SessionLogger } from "./SessionLogger";
import { computeBestVolumes } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: { day: string } }) {
  const day = Number(params.day);
  if (!day || day < 1 || day > 3) notFound();

  const exos = await prisma.exercise.findMany({
    where: { dayNumber: day },
    orderBy: { orderIndex: "asc" },
  });

  const lastSession = await prisma.workoutSession.findFirst({
    where: { dayNumber: day },
    orderBy: { date: "desc" },
    include: { sets: true },
  });

  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });

  // Records historiques par exercice : volume max (kg × reps) toutes séances confondues
  const allSets = await prisma.workoutSet.findMany({
    where: { exerciseId: { in: exos.map((e) => e.id) } },
    select: { exerciseId: true, weightKg: true, reps: true },
  });
  const bestVolumes = computeBestVolumes(allSets);

  return (
    <SessionLogger
      day={day}
      exercises={exos}
      lastSession={
        lastSession
          ? {
              date: lastSession.date.toISOString(),
              sets: lastSession.sets.map((s) => ({
                exerciseId: s.exerciseId,
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
