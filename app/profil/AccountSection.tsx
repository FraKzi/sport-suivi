"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardTitle, Button } from "@/components/ui";

export function AccountSection({
  username,
  isAdmin,
}: {
  username: string;
  isAdmin: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <Card>
      <CardTitle>🔐 Compte</CardTitle>
      <div className="space-y-2">
        <div className="text-sm">
          Connecté en tant que{" "}
          <span className="font-medium">{username}</span>
          {isAdmin && <span className="text-accent text-xs ml-2">admin</span>}
        </div>
        {isAdmin && (
          <div>
            <Link
              href="/admin/invites"
              className="inline-block text-sm bg-surface2 hover:bg-surface2/70 border border-border px-3 py-2 rounded-md"
            >
              🎟 Codes d&apos;invitation
            </Link>
          </div>
        )}
        <div>
          <Button onClick={logout} disabled={busy} variant="danger">
            {busy ? "Déconnexion…" : "🚪 Se déconnecter"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
