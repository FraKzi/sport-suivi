import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

const COOKIE_NAME = "sport_suivi_session";
const SESSION_TTL_DAYS = 30;

function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Crée une session DB + pose le cookie HTTP-only. À appeler côté server action / API route. */
export async function createSession(userId: number): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.authSession.create({
    data: { id: token, userId, expiresAt },
  });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Supprime la session DB + clear le cookie. */
export async function destroySession(): Promise<void> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { id: token } });
  }
  cookies().delete(COOKIE_NAME);
}

/**
 * Retourne l'utilisateur connecté ou null. Lecture du cookie + lookup DB.
 * À utiliser dans les server components et API routes.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Session expirée → on nettoie de manière opportuniste
    await prisma.authSession.delete({ where: { id: token } }).catch(() => {});
    return null;
  }
  return session.user;
}

/** Helper pour les pages : redirige vers /login si pas connecté, sinon retourne le user. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Helper pour les pages réservées admin. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}
