import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateRecoveryPhrase } from "@/lib/recoveryPhrase";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
  username: z
    .string()
    .trim()
    .min(3, "3 caractères minimum")
    .max(30, "30 caractères max")
    .regex(/^[a-zA-Z0-9_-]+$/, "lettres, chiffres, - et _ uniquement"),
  password: z.string().min(8, "8 caractères minimum").max(200),
  inviteCode: z.string().trim().min(4).max(50),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }
  const username = parsed.data.username.toLowerCase();
  const { password, inviteCode } = parsed.data;

  // 1) Code d'invitation valide et non utilisé
  const invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode } });
  if (!invite || invite.usedById !== null) {
    return NextResponse.json({ error: "Code d'invitation invalide ou déjà utilisé" }, { status: 400 });
  }

  // 2) Username libre
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 400 });
  }

  // 3) Création user + consommation invite en transaction
  const recoveryPhrase = generateRecoveryPhrase();
  const passwordHash = await hashPassword(password);
  const recoveryHash = await bcrypt.hash(recoveryPhrase, 10);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { username, passwordHash, recoveryHash, isAdmin: false },
    });
    await tx.inviteCode.update({
      where: { code: inviteCode },
      data: { usedById: u.id, usedAt: new Date() },
    });
    return u;
  });

  await createSession(user.id);

  // Phrase renvoyée UNE SEULE FOIS dans la réponse — à afficher à l'utilisateur
  return NextResponse.json({ ok: true, recoveryPhrase });
}
