import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "30");
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    take: limit,
    orderBy: { date: "desc" },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
      },
    },
  });
  return NextResponse.json(sessions);
}

const SET = z.object({
  exerciseId: z.number().int(),
  setNumber: z.number().int().min(1).max(20),
  weightKg: z.number().min(0).max(500).nullable().optional(),
  reps: z.number().int().min(0).max(200).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
});

const POST_SCHEMA = z.object({
  date: z.string().datetime().optional(),
  dayNumber: z.number().int().min(1).max(3),
  durationMin: z.number().int().min(0).max(300).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  bodyWeight: z.number().min(30).max(300).nullable().optional(),
  sets: z.array(SET),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = POST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const session = await prisma.workoutSession.create({
    data: {
      userId: user.id,
      date: data.date ? new Date(data.date) : undefined,
      dayNumber: data.dayNumber,
      durationMin: data.durationMin ?? null,
      notes: data.notes ?? null,
      bodyWeight: data.bodyWeight ?? null,
      sets: {
        create: data.sets.map((s) => ({
          exerciseId: s.exerciseId,
          setNumber: s.setNumber,
          weightKg: s.weightKg ?? null,
          reps: s.reps ?? null,
          rpe: s.rpe ?? null,
          notes: s.notes ?? null,
        })),
      },
    },
    include: { sets: true },
  });
  return NextResponse.json(session);
}
