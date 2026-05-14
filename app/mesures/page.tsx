import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MeasurementsView } from "./MeasurementsView";

export const dynamic = "force-dynamic";

export default async function MesuresPage() {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const measurements = await prisma.bodyMeasurement.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <MeasurementsView
      profile={
        profile
          ? { sex: profile.sex, heightCm: profile.heightCm, weightKg: profile.currentWeight }
          : null
      }
      measurements={measurements.map((m) => ({
        id: m.id,
        date: m.date.toISOString(),
        waistCm: m.waistCm,
        hipCm: m.hipCm,
        neckCm: m.neckCm,
        chestCm: m.chestCm,
        armCm: m.armCm,
        thighCm: m.thighCm,
        bodyFatPct: m.bodyFatPct,
        notes: m.notes,
      }))}
    />
  );
}
