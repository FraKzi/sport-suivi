import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
  const snapshots = await prisma.profileSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: limit,
  });
  return NextResponse.json(snapshots);
}
