import { prisma } from "@/lib/prisma";
import { MeasurementsView } from "./MeasurementsView";

export const dynamic = "force-dynamic";

export default async function MesuresPage() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  const measurements = await prisma.bodyMeasurement.findMany({
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
