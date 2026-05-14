"use client";
import { useState } from "react";
import { Card, CardTitle, Button, Badge } from "@/components/ui";

type Code = {
  code: string;
  createdAt: string;
  usedAt: string | null;
  usedByUsername: string | null;
};

export function InvitesClient({ initial }: { initial: Code[] }) {
  const [codes, setCodes] = useState<Code[]>(initial);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const res = await fetch("/api/admin/invites", { method: "POST" });
    setBusy(false);
    if (!res.ok) return;
    const j = await res.json();
    setCodes((prev) => [
      { code: j.code, createdAt: j.createdAt, usedAt: null, usedByUsername: null },
      ...prev,
    ]);
  }

  return (
    <div className="space-y-4">
      <Button onClick={generate} disabled={busy}>
        {busy ? "Génération…" : "+ Générer un nouveau code"}
      </Button>

      <Card>
        <CardTitle>Codes existants</CardTitle>
        {codes.length === 0 ? (
          <p className="text-sm text-muted">Aucun code généré.</p>
        ) : (
          <ul className="divide-y divide-border">
            {codes.map((c) => (
              <li key={c.code} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <code className="font-mono text-sm select-all">{c.code}</code>
                  <div className="text-xs text-muted mt-0.5">
                    Créé le {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                {c.usedAt ? (
                  <Badge tone="default">
                    Utilisé par {c.usedByUsername ?? "?"}
                  </Badge>
                ) : (
                  <Badge tone="success">Disponible</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
