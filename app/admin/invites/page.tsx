import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { InvitesClient } from "./InvitesClient";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  await requireAdmin();
  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { usedBy: { select: { username: true } } },
  });
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">🎟 Codes d'invitation</h1>
      <p className="text-sm text-muted">
        Génère un code, transmets-le à ton ami. Il lui permettra de créer un
        compte une seule fois (le code est consommé à l'inscription).
      </p>
      <InvitesClient
        initial={codes.map((c) => ({
          code: c.code,
          createdAt: c.createdAt.toISOString(),
          usedAt: c.usedAt?.toISOString() ?? null,
          usedByUsername: c.usedBy?.username ?? null,
        }))}
      />
    </div>
  );
}
