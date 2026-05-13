import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
  const snapshots = await prisma.profileSnapshot.findMany({
    orderBy: { date: "desc" },
    take: limit,
  });
  return NextResponse.json(snapshots);
}
