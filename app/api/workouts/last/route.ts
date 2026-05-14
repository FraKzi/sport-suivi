import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * Renvoie la dernière performance par exercice pour un dayNumber donné
 * (pour pré-remplir une nouvelle séance avec les charges précédentes du user).
 */
export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const day = Number(url.searchParams.get("day"));
  if (!day) return NextResponse.json({ error: "day required" }, { status: 400 });

  const lastSession = await prisma.workoutSession.findFirst({
    where: { userId: user.id, dayNumber: day },
    orderBy: { date: "desc" },
    include: { sets: { include: { userExercise: true } } },
  });

  if (!lastSession) return NextResponse.json(null);
  return NextResponse.json(lastSession);
}
