import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const day = url.searchParams.get("day");
  const where = day ? { dayNumber: Number(day) } : {};
  const exos = await prisma.exercise.findMany({
    where,
    orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
  });
  return NextResponse.json(exos);
}
