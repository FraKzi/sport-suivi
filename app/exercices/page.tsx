import { prisma } from "@/lib/prisma";
import { ExerciseEditor } from "./ExerciseEditor";

export const dynamic = "force-dynamic";

export default async function ExercicesPage() {
  const active = await prisma.exercise.findMany({
    where: { archived: false },
    orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
  });
  const archived = await prisma.exercise.findMany({
    where: { archived: true },
    orderBy: [{ dayNumber: "asc" }, { name: "asc" }],
  });

  return <ExerciseEditor active={active} archived={archived} />;
}
