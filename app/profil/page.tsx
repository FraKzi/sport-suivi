import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";
import { ProfileHistory } from "./ProfileHistory";
import { ExportData } from "./ExportData";
import { ProgramSection } from "./ProgramSection";
import { AccountSection } from "./AccountSection";
import { GoalsSection } from "./GoalsSection";
import { SPLIT_LABEL } from "@/lib/programGenerator";
import { WATER_ML_PER_KG, DEFAULT_STEPS_TARGET } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });

  // Programme actif + résumé pour la section dédiée
  const program = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    include: {
      priorities: true,
      _count: { select: { exercises: { where: { archived: false } } } },
    },
  });

  // Compteurs pour la section Export — scopés au user connecté
  const [workouts, weights, measurements, daily, meals, snapshots] = await Promise.all([
    prisma.workoutSet.count({ where: { session: { userId: user.id } } }),
    prisma.weightLog.count({ where: { userId: user.id } }),
    prisma.bodyMeasurement.count({ where: { userId: user.id } }),
    prisma.dailyLog.count({ where: { userId: user.id } }),
    prisma.mealConsumption.count({ where: { userId: user.id } }),
    prisma.profileSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <ProfileForm initial={profile} />
      <ProgramSection
        program={
          program
            ? {
                id: program.id,
                splitLabel: SPLIT_LABEL[program.split],
                split: program.split,
                daysPerWeek: program.daysPerWeek,
                daysLabels: JSON.parse(program.daysLabels) as string[],
                createdAt: program.createdAt.toISOString(),
                exercisesCount: program._count.exercises,
                priorities: Object.fromEntries(
                  program.priorities.map((p) => [p.muscleGroup, p.priority]),
                ),
              }
            : null
        }
      />
      <GoalsSection
        waterTargetMl={profile?.waterTargetMl ?? null}
        stepsTarget={profile?.stepsTarget ?? null}
        autoWaterTargetMl={
          profile
            ? Math.round(profile.currentWeight * WATER_ML_PER_KG)
            : 2500
        }
        autoStepsTarget={DEFAULT_STEPS_TARGET}
      />
      <ProfileHistory snapshots={snapshots} />
      <ExportData counts={{ workouts, weights, measurements, daily, meals }} />
      <AccountSection username={user.username} isAdmin={user.isAdmin} />
    </div>
  );
}
