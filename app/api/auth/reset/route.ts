import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { normalizeRecoveryPhrase } from "@/lib/recoveryPhrase";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SCHEMA = z.object({
  username: z.string().trim().min(1).max(50),
  recoveryPhrase: z.string().trim().min(10).max(200),
  newPassword: z.string().min(8, "8 caractères minimum").max(200),
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
  const { newPassword } = parsed.data;
  const username = parsed.data.username.toLowerCase();
  const phrase = normalizeRecoveryPhrase(parsed.data.recoveryPhrase);

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    // Message volontairement générique pour ne pas révéler l'existence d'un compte
    return NextResponse.json({ error: "Identifiant ou phrase de récupération incorrect" }, { status: 401 });
  }
  const ok = await bcrypt.compare(phrase, user.recoveryHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiant ou phrase de récupération incorrect" }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Invalide toutes les sessions existantes (sécurité : si la phrase a fuité, le pirate est dégagé)
  await prisma.authSession.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
