import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./ProfileForm";
import { ProfileHistory } from "./ProfileHistory";
import { ExportData } from "./ExportData";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });

  // Compteurs pour la section Export
  const [workouts, weights, measurements, daily, meals, snapshots] = await Promise.all([
    prisma.workoutSet.count(),
    prisma.weightLog.count(),
    prisma.bodyMeasurement.count(),
    prisma.dailyLog.count(),
    prisma.mealConsumption.count(),
    prisma.profileSnapshot.findMany({
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
