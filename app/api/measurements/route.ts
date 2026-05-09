import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const POST_SCHEMA = z.object({
  date: z.string().datetime().optional(),
  waistCm: z.number().min(30).max(200).nullable().optional(),
  hipCm: z.number().min(30).max(200).nullable().optional(),
  neckCm: z.number().min(20).max(80).nullable().optional(),
  chestCm: z.number().min(50).max(200).nullable().optional(),
  armCm: z.number().min(15).max(80).nullable().optional(),
  thighCm: z.number().min(30).max(120).nullable().optional(),
  bodyFatPct: z.number().min(2).max(60).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET() {
  const measurements = await prisma.bodyMeasurement.findMany({
    orderBy: { date: "desc" },
    take: 100,
  });
  return NextResponse.json(measurements);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = POST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  // Au moins une mesure utile
  const hasAny =
    data.waistCm != null ||
    data.hipCm != null ||
    data.neckCm != null ||
    data.chestCm != null ||
    data.armCm != null ||
    data.thighCm != null ||
    data.bodyFatPct != null;
  if (!hasAny) {
    return NextResponse.json(
      { error: "Renseigne au moins une mesure." },
      { status: 400 },
    );
  }

  const m = await prisma.bodyMeasurement.create({
    data: {
      date: data.date ? new Date(data.date) : undefined,
      waistCm: data.waistCm ?? null,
      hipCm: data.hipCm ?? null,
      neckCm: data.neckCm ?? null,
      chestCm: data.chestCm ?? null,
      armCm: data.armCm ?? null,
      thighCm: data.thighCm ?? null,
      bodyFatPct: data.bodyFatPct ?? null,
      notes: data.notes ?? null,
    },
  });
  return NextResponse.json(m);
}
