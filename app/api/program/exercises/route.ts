import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const POST_SCHEMA = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["POLY", "ISO"]),
  primaryMuscle: z.enum([
    "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS",
    "QUADS", "HAMSTRINGS", "GLUTES", "CALVES", "ABS",
  ]),
  dayNumber: z.number().int().min(1).max(7),
  prescription: z.string().trim().min(1).max(40),
  description: z.string().max(500).nullable().optional(),
});

// Crée un exercice custom dans le programme actif du user.
export async function POST(req: Request) {
  const user = await requireUser();
  const program = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    select: { id: true, daysPerWeek: true },
  });
  if (!program) {
    return NextResponse.json({ error: "Pas de programme actif" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const parsed = POST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  if (data.dayNumber > program.daysPerWeek) {
    return NextResponse.json({ error: "Jour hors du split" }, { status: 400 });
  }
  // Plage orderIndex = max(existing) + 1 pour ce jour
  const lastOrder = await prisma.userExercise.aggregate({
    where: { programId: program.id, dayNumber: data.dayNumber, archived: false },
    _max: { orderIndex: true },
  });
  const exo = await prisma.userExercise.create({
    data: {
      programId: program.id,
      name: data.name,
      type: data.type,
      primaryMuscle: data.primaryMuscle,
      dayNumber: data.dayNumber,
      orderIndex: (lastOrder._max.orderIndex ?? 0) + 1,
      prescription: data.prescription,
      description: data.description ?? null,
    },
  });
  return NextResponse.json(exo);
}
