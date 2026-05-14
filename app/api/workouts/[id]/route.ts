import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: {
      sets: {
        include: { userExercise: true },
        orderBy: [{ userExerciseId: "asc" }, { setNumber: "asc" }],
      },
    },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  const res = await prisma.workoutSession.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
