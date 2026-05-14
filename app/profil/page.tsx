import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";
import { ProfileHistory } from "./ProfileHistory";
import { ExportData } from "./ExportData";
import { ProgramSection } from "./ProgramSection";
import { SPLIT_LABEL } from "@/lib/programGenerator";

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
      <ProfileHistory snapshots={snapshots} />
      <ExportData counts={{ workouts, weights, measurements, daily, meals }} />
    </div>
  );
}
