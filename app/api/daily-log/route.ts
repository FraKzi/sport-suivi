import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

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
  const user = await requireUser();
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (date) {
    if (!YMD.test(date)) {
      return NextResponse.json({ error: "date invalide (YYYY-MM-DD)" }, { status: 400 });
    }
    const log = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId: user.id, date: parseYmd(date) } },
    });
    return NextResponse.json(log);
  }
  const logs = await prisma.dailyLog.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 30,
  });
  return NextResponse.json(logs);
}

export async function PUT(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = PUT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, ...rest } = parsed.data;
  const dateAt = parseYmd(date);
  const log = await prisma.dailyLog.upsert({
    where: { userId_date: { userId: user.id, date: dateAt } },
    create: { userId: user.id, date: dateAt, ...rest },
    update: rest,
  });
  return NextResponse.json(log);
}
