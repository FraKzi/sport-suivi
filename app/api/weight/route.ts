import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = await prisma.weightLog.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(logs);
}

const POST_SCHEMA = z.object({
  weightKg: z.number().min(30).max(300),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = POST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const log = await prisma.weightLog.create({
    data: {
      weightKg: parsed.data.weightKg,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      notes: parsed.data.notes,
    },
  });

  // synchro avec UserProfile.currentWeight
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  if (profile) {
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: { currentWeight: parsed.data.weightKg },
    });
  }

  return NextResponse.json(log);
}
