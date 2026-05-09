import { NextResponse } from "next/server";
import { z } from "zod";
import { MealSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function parseYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

const POST_SCHEMA = z.object({
  date: z.string().regex(YMD),
  slot: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  mealId: z.number().int(),
});

const DELETE_SCHEMA = z.object({
  date: z.string().regex(YMD),
  slot: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (date && !YMD.test(date)) {
    return NextResponse.json({ error: "date invalide (YYYY-MM-DD)" }, { status: 400 });
  }
  const where = date ? { date: parseYmd(date) } : {};
  const list = await prisma.mealConsumption.findMany({
    where,
    orderBy: { date: "desc" },
    include: { meal: { include: { items: { include: { food: true } } } } },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = POST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, slot, mealId } = parsed.data;

  // Vérifie que le meal existe et correspond au slot
  const meal = await prisma.meal.findUnique({ where: { id: mealId } });
  if (!meal || meal.slot !== slot) {
    return NextResponse.json({ error: "Variante invalide pour ce slot" }, { status: 400 });
  }

  const dateAt = parseYmd(date);
  const consumption = await prisma.mealConsumption.upsert({
    where: { date_slot: { date: dateAt, slot: slot as MealSlot } },
    create: { date: dateAt, slot: slot as MealSlot, mealId },
    update: { mealId },
  });
  return NextResponse.json(consumption);
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  // Accepte soit body, soit query params
  const url = new URL(req.url);
  const payload = body ?? {
    date: url.searchParams.get("date"),
    slot: url.searchParams.get("slot"),
  };
  const parsed = DELETE_SCHEMA.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, slot } = parsed.data;
  await prisma.mealConsumption.deleteMany({
    where: { date: parseYmd(date), slot: slot as MealSlot },
  });
  return NextResponse.json({ ok: true });
}
