import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const profile = await prisma.userProfile.findFirst({ orderBy: { id: "asc" } });
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <ProfileForm initial={profile} />
    </div>
  );
}
