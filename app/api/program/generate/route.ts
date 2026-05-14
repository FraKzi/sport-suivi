import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateProgram, ALL_MUSCLES } from "@/lib/programGenerator";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
  split: z.enum(["PPL_3", "UL_4", "PPL_UL_5", "PPL_6"]),
  priorities: z.record(
    z.enum([
      "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS",
      "QUADS", "HAMSTRINGS", "GLUTES", "CALVES", "ABS",
    ]),
    z.enum(["MAINTENANCE", "MODERATE", "EMPHASIZED"]),
  ),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { split, priorities } = parsed.data;

  const generated = generateProgram({ split, priorities });

  // On désactive les anciens programmes et on crée le nouveau dans la même
  // transaction. Le nom des exos vient du catalog ; on lookup l'id par nom.
  const catalogByName = new Map(
    (
      await prisma.exerciseCatalog.findMany({
        where: { name: { in: generated.exercises.map((e) => e.catalogName) } },
        select: { id: true, name: true },
      })
    ).map((c) => [c.name, c.id]),
  );

  const program = await prisma.$transaction(async (tx) => {
    await tx.userProgram.updateMany({
      where: { userId: user.id, active: true },
      data: { active: false },
    });
    return tx.userProgram.create({
      data: {
        userId: user.id,
        split: generated.split,
        daysPerWeek: generated.daysPerWeek,
        daysLabels: JSON.stringify(generated.daysLabels),
        active: true,
        priorities: {
          create: ALL_MUSCLES.map((m) => ({
            muscleGroup: m,
            priority: priorities[m] ?? "MODERATE",
          })),
        },
        exercises: {
          create: generated.exercises.map((e) => ({
            catalogId: catalogByName.get(e.catalogName) ?? null,
            name: e.name,
            type: e.type,
            primaryMuscle: e.primaryMuscle,
            secondaryMuscles: e.secondaryMuscles.length > 0 ? e.secondaryMuscles.join(",") : null,
            dayNumber: e.dayNumber,
            orderIndex: e.orderIndex,
            prescription: e.prescription,
            description: e.description ?? null,
          })),
        },
      },
      include: { exercises: true, priorities: true },
    });
  });

  return NextResponse.json({
    id: program.id,
    split: program.split,
    daysPerWeek: program.daysPerWeek,
    daysLabels: JSON.parse(program.daysLabels) as string[],
    exercisesCount: program.exercises.length,
  });
}
