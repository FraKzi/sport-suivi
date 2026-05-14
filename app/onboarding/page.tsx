import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { OnboardingClient } from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();
  // Si l'utilisateur a déjà un programme actif, on n'a rien à lui montrer ici.
  // La regénération se fait depuis /profil.
  const existing = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    select: { id: true },
  });
  if (existing) redirect("/");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bienvenue 💪</h1>
        <p className="text-sm text-muted mt-1">
          Configurons ton programme d&apos;entraînement. Le générateur s&apos;appuie
          sur la pyramide d&apos;Eric Helms : volume, intensité et fréquence.
        </p>
      </div>
      <OnboardingClient />
    </div>
  );
}
