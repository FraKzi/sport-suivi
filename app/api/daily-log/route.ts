import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function parseYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

const PUT_SCHEMA = z.object({
  date: z.string().regex(YMD),
  steps: z.number().int().min(0).max(200000).optional(),
  waterMl: z.number().int().min(0).max(20000).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (date) {
    if (!YMD.test(date)) {
      return NextResponse.json({ error: "date invalide (YYYY-MM-DD)" }, { status: 400 });
    }
    const log = await prisma.dailyLog.findUnique({ where: { date: parseYmd(date) } });
    return NextResponse.json(log);
  }
  const logs = await prisma.dailyLog.findMany({ orderBy: { date: "desc" }, take: 30 });
  return NextResponse.json(logs);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const parsed = PUT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, ...rest } = parsed.data;
  const dateAt = parseYmd(date);
  const log = await prisma.dailyLog.upsert({
    where: { date: dateAt },
    create: { date: dateAt, ...rest },
    update: rest,
  });
  return NextResponse.json(log);
}
