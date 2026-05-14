import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PUT_SCHEMA = z.object({
  displayName: z.string().trim().min(1).max(30).nullable().optional(),
  age: z.number().int().min(10).max(100),
  sex: z.enum(["MALE", "FEMALE"]),
  heightCm: z.number().min(100).max(250),
  currentWeight: z.number().min(30).max(300),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "HIGH", "VERY_HIGH"]),
  tdee: z.number().int().min(800).max(6000),
  goal: z.enum(["CUTTING", "RECOMP", "BULKING", "MAINTENANCE"]),
});

export async function GET() {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = PUT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const profile = existing
    ? await prisma.userProfile.update({ where: { id: existing.id }, data })
    : await prisma.userProfile.create({ data: { ...data, userId: user.id } });

  // log automatique du poids si nouveau
  const lastWeight = await prisma.weightLog.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });
  if (!lastWeight || lastWeight.weightKg !== data.currentWeight) {
    await prisma.weightLog.create({
      data: { userId: user.id, weightKg: data.currentWeight },
    });
  }

  // Snapshot des paramètres de calcul macro si une valeur a changé.
  const lastSnapshot = await prisma.profileSnapshot.findFirst({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });
  const macroParamsChanged =
    !lastSnapshot ||
    lastSnapshot.weightKg !== data.currentWeight ||
    lastSnapshot.activityLevel !== data.activityLevel ||
    lastSnapshot.tdee !== data.tdee ||
    lastSnapshot.goal !== data.goal;

  if (macroParamsChanged) {
    await prisma.profileSnapshot.create({
      data: {
        userId: user.id,
        age: data.age,
        sex: data.sex,
        heightCm: data.heightCm,
        weightKg: data.currentWeight,
        activityLevel: data.activityLevel,
        tdee: data.tdee,
        goal: data.goal,
      },
    });
  }

  return NextResponse.json(profile);
}
