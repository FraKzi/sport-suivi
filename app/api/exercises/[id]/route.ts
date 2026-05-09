import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PATCH_SCHEMA = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(["POLY", "ISO"]).optional(),
  dayNumber: z.number().int().min(1).max(3).optional(),
  orderIndex: z.number().int().min(0).max(99).optional(),
  prescription: z.string().trim().min(1).max(50).optional(),
  description: z.string().max(500).nullable().optional(),
  muscleGroups: z.string().max(100).nullable().optional(),
  archived: z.boolean().optional(),
});

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  return Number.isFinite(id) ? id : null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (id == null) return NextResponse.json({ error: "id invalide" }, { status: 400 });

  const body = await req.json();
  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const exo = await prisma.exercise.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(exo);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Un exercice avec ce nom existe déjà." },
        { status: 409 },
      );
    }
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Exercice introuvable" }, { status: 404 });
    }
    throw e;
  }
}

/**
 * Soft-delete : on marque archived=true au lieu de supprimer, ce qui préserve
 * les WorkoutSets de l'historique. Pour purger définitivement, passer ?hard=true.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (id == null) return NextResponse.json({ error: "id invalide" }, { status: 400 });

  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "true";

  if (hard) {
    // Vérifie qu'aucun set ne référence cet exercice avant purge
    const refs = await prisma.workoutSet.count({ where: { exerciseId: id } });
    if (refs > 0) {
      return NextResponse.json(
        {
          error: `Impossible de supprimer définitivement : ${refs} série(s) historique(s) y font référence. Archive plutôt.`,
        },
        { status: 409 },
      );
    }
    await prisma.exercise.delete({ where: { id } });
    return NextResponse.json({ ok: true, hard: true });
  }

  await prisma.exercise.update({
    where: { id },
    data: { archived: true },
  });
  return NextResponse.json({ ok: true, archived: true });
}
