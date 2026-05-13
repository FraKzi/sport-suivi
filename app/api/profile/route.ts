import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const parsed = PUT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  const profile = existing
    ? await prisma.userProfile.update({ where: { id: existing.id }, data })
    : await prisma.userProfile.create({ data });

  // log automatique du poids si nouveau
  const lastWeight = await prisma.weightLog.findFirst({ orderBy: { date: "desc" } });
  if (!lastWeight || lastWeight.weightKg !== data.currentWeight) {
    await prisma.weightLog.create({ data: { weightKg: data.currentWeight } });
  }

  // Snapshot des paramètres de calcul macro si une valeur a changé.
  // On ignore les changements de displayName / âge / sexe / taille (n'affectent pas
  // directement la cible macro à un instant T, ou changent très rarement).
  const lastSnapshot = await prisma.profileSnapshot.findFirst({ orderBy: { date: "desc" } });
  const macroParamsChanged =
    !lastSnapshot ||
    lastSnapshot.weightKg !== data.currentWeight ||
    lastSnapshot.activityLevel !== data.activityLevel ||
    lastSnapshot.tdee !== data.tdee ||
    lastSnapshot.goal !== data.goal;

  if (macroParamsChanged) {
    await prisma.profileSnapshot.create({
      data: {
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
