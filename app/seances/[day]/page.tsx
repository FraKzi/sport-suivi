import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { SessionLogger } from "./SessionLogger";
import { computeBestVolumes } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: { day: string } }) {
  const day = Number(params.day);
  if (!day || day < 1) notFound();
  const user = await requireUser();

  const program = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    include: {
      exercises: {
        where: { dayNumber: day, archived: false },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
  if (!program) redirect("/onboarding");
  if (day > program.daysPerWeek) notFound();

  const exos = program.exercises;
  const daysLabels = JSON.parse(program.daysLabels) as string[];
  const dayTitle = daysLabels[day - 1] ?? `Jour ${day}`;

  const lastSession = await prisma.workoutSession.findFirst({
    where: { userId: user.id, dayNumber: day },
    orderBy: { date: "desc" },
    include: { sets: true },
  });

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });

  // Records historiques par UserExercise (volume max kg × reps)
  const allSets = await prisma.workoutSet.findMany({
    where: {
      session: { userId: user.id },
      userExerciseId: { in: exos.map((e) => e.id) },
    },
    select: { userExerciseId: true, weightKg: true, reps: true },
  });
  const bestVolumes = computeBestVolumes(
    allSets.map((s) => ({
      exerciseId: s.userExerciseId!,
      weightKg: s.weightKg,
      reps: s.reps,
    })),
  );

  return (
    <SessionLogger
      day={day}
      dayTitle={dayTitle}
      exercises={exos.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        prescription: e.prescription,
        description: e.description,
        primaryMuscle: e.primaryMuscle,
        secondaryMuscles: e.secondaryMuscles,
        orderIndex: e.orderIndex,
      }))}
      lastSession={
        lastSession
          ? {
              date: lastSession.date.toISOString(),
              sets: lastSession.sets
                .filter((s) => s.userExerciseId != null)
                .map((s) => ({
                  userExerciseId: s.userExerciseId!,
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
