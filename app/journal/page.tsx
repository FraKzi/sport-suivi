import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { JournalClient } from "./JournalClient";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });

  // 365 jours d'historique pour pouvoir alimenter la section Tendances (semaine/mois/année)
  const yearStart = new Date();
  yearStart.setHours(0, 0, 0, 0);
  yearStart.setDate(yearStart.getDate() - 365);

  const recentLogs = await prisma.dailyLog.findMany({
    where: { userId: user.id, date: { gte: yearStart } },
    orderBy: { date: "desc" },
  });
  const recentWorkouts = await prisma.workoutSession.findMany({
    where: { userId: user.id, date: { gte: yearStart } },
    orderBy: { date: "desc" },
    select: { date: true, durationMin: true, dayNumber: true },
  });

  return (
    <JournalClient
      profile={
        profile
          ? {
              weight: profile.currentWeight,
              height: profile.heightCm,
              age: profile.age,
              sex: profile.sex,
              waterTargetMl: profile.waterTargetMl,
              stepsTarget: profile.stepsTarget,
            }
          : null
      }
      recentLogs={recentLogs.map((l) => ({
        date: l.date.toISOString(),
        steps: l.steps,
        waterMl: l.waterMl,
      }))}
      recentWorkouts={recentWorkouts.map((w) => ({
        date: w.date.toISOString(),
        durationMin: w.durationMin,
        dayNumber: w.dayNumber,
      }))}
    />
  );
}
