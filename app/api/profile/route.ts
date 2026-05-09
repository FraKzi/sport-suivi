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

  const existing = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  const profile = existing
    ? await prisma.userProfile.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.userProfile.create({ data: parsed.data });

  // log automatique du poids si nouveau
  const last = await prisma.weightLog.findFirst({ orderBy: { date: "desc" } });
  if (!last || last.weightKg !== parsed.data.currentWeight) {
    await prisma.weightLog.create({ data: { weightKg: parsed.data.currentWeight } });
  }

  return NextResponse.json(profile);
}
