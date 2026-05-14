import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PATCH_SCHEMA = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  type: z.enum(["POLY", "ISO"]).optional(),
  primaryMuscle: z.enum([
    "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS",
    "QUADS", "HAMSTRINGS", "GLUTES", "CALVES", "ABS",
  ]).optional(),
  dayNumber: z.number().int().min(1).max(7).optional(),
  orderIndex: z.number().int().min(0).max(100).optional(),
  prescription: z.string().trim().min(1).max(40).optional(),
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  archived: z.boolean().optional(),
});

async function loadOwned(userId: number, id: number) {
  const exo = await prisma.userExercise.findUnique({
    where: { id },
    include: { program: { select: { userId: true, daysPerWeek: true } } },
  });
  if (!exo || exo.program.userId !== userId) return null;
  return exo;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  const exo = await loadOwned(user.id, id);
  if (!exo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.dayNumber && parsed.data.dayNumber > exo.program.daysPerWeek) {
    return NextResponse.json({ error: "Jour hors du split" }, { status: 400 });
  }
  const updated = await prisma.userExercise.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  const exo = await loadOwned(user.id, id);
  if (!exo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete : on archive l'exo (les sets historiques pointent dessus).
  // Hard delete uniquement si jamais utilisé.
  const usedCount = await prisma.workoutSet.count({ where: { userExerciseId: id } });
  if (usedCount > 0) {
    await prisma.userExercise.update({ where: { id }, data: { archived: true } });
    return NextResponse.json({ archived: true });
  }
  await prisma.userExercise.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
