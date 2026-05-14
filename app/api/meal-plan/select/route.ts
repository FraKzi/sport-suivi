import { NextResponse } from "next/server";
import { z } from "zod";
import { MealSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
  slot: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  mealId: z.number().int(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { slot, mealId } = parsed.data;

  // Vérifie que le meal existe, slot correct, ET appartient à un plan du user
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: { plan: { select: { userId: true } } },
  });
  if (!meal || meal.slot !== slot || meal.plan.userId !== user.id) {
    return NextResponse.json({ error: "Variante invalide pour ce slot" }, { status: 400 });
  }

  const pref = await prisma.userMealPreference.upsert({
    where: { userId_slot: { userId: user.id, slot: slot as MealSlot } },
    create: { userId: user.id, slot: slot as MealSlot, mealId },
    update: { mealId },
  });

  return NextResponse.json(pref);
}
