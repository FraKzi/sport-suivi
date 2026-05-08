import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  await prisma.weightLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
