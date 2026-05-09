import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./ProfileForm";
import { ExportData } from "./ExportData";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });

  // Compteurs pour la section Export
  const [workouts, weights, measurements, daily, meals] = await Promise.all([
    prisma.workoutSet.count(),
    prisma.weightLog.count(),
    prisma.bodyMeasurement.count(),
    prisma.dailyLog.count(),
    prisma.mealConsumption.count(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <ProfileForm initial={profile} />
      <ExportData counts={{ workouts, weights, measurements, daily, meals }} />
    </div>
  );
}
