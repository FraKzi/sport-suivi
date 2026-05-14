import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";
import { ProfileHistory } from "./ProfileHistory";
import { ExportData } from "./ExportData";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });

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
      <ProfileHistory snapshots={snapshots} />
      <ExportData counts={{ workouts, weights, measurements, daily, meals }} />
    </div>
  );
}
