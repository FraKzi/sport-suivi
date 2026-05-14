import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// null = reset à la valeur auto-calculée (eau : 35 ml/kg · pas : 8000)
const PATCH_SCHEMA = z.object({
  waterTargetMl: z.number().int().min(500).max(10000).nullable().optional(),
  stepsTarget: z.number().int().min(1000).max(100000).nullable().optional(),
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: "Profil manquant" }, { status: 400 });
  }
  const updated = await prisma.userProfile.update({
    where: { id: profile.id },
    data: parsed.data,
    select: { waterTargetMl: true, stepsTarget: true },
  });
  return NextResponse.json(updated);
}
