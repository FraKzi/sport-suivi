import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const POST_SCHEMA = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(["POLY", "ISO"]),
  dayNumber: z.number().int().min(1).max(3),
  orderIndex: z.number().int().min(0).max(99).optional(),
  prescription: z.string().trim().min(1).max(50),
  description: z.string().max(500).nullable().optional(),
  muscleGroups: z.string().max(100).nullable().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const day = url.searchParams.get("day");
  const includeArchived = url.searchParams.get("archived") === "true";
  const where: { dayNumber?: number; archived?: boolean } = {};
  if (day) where.dayNumber = Number(day);
  if (!includeArchived) where.archived = false;
  const exos = await prisma.exercise.findMany({
    where,
    orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
  });
  return NextResponse.json(exos);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = POST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Si pas d'orderIndex fourni → place en fin de jour
  let orderIndex = data.orderIndex;
  if (orderIndex == null) {
    const last = await prisma.exercise.findFirst({
      where: { dayNumber: data.dayNumber, archived: false },
      orderBy: { orderIndex: "desc" },
    });
    orderIndex = (last?.orderIndex ?? 0) + 1;
  }

  try {
    const exo = await prisma.exercise.create({
      data: {
        name: data.name,
        type: data.type,
        dayNumber: data.dayNumber,
        orderIndex,
        prescription: data.prescription,
        description: data.description ?? null,
        muscleGroups: data.muscleGroups ?? null,
      },
    });
    return NextResponse.json(exo);
  } catch (e: any) {
    // Contrainte unique sur le nom
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Un exercice avec ce nom existe déjà." },
        { status: 409 },
      );
    }
    throw e;
  }
}
