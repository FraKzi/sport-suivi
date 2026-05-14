import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function genCode(): string {
  // Code court mais hors brute-force facile : ~8e9 combinaisons
  // Format : FRK-XXXX-XXXX (alphanum sans caractères ambigus 0/O, 1/I/L)
  const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const seg = () =>
    Array.from(crypto.randomBytes(4))
      .map((b) => ALPHA[b % ALPHA.length])
      .join("");
  return `FRK-${seg()}-${seg()}`;
}

export async function GET() {
  const admin = await requireAdmin();
  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { usedBy: { select: { username: true } } },
  });
  return NextResponse.json({
    me: { id: admin.id, username: admin.username },
    codes: codes.map((c) => ({
      code: c.code,
      createdAt: c.createdAt.toISOString(),
      usedAt: c.usedAt?.toISOString() ?? null,
      usedByUsername: c.usedBy?.username ?? null,
    })),
  });
}

export async function POST() {
  const admin = await requireAdmin();
  let code = genCode();
  // Très peu probable mais on s'assure de l'unicité
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.inviteCode.findUnique({ where: { code } });
    if (!existing) break;
    code = genCode();
  }
  const created = await prisma.inviteCode.create({
    data: { code, createdById: admin.id },
  });
  return NextResponse.json({ code: created.code, createdAt: created.createdAt.toISOString() });
}
