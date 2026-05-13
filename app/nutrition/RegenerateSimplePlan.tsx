"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, Button } from "@/components/ui";

export function RegenerateSimplePlan() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function regenerate() {
    const ok = window.confirm(
      "Régénérer un plan SIMPLE à partir de tes macros ?\n\n" +
        "• Remplace le plan actuel (toutes les variantes seront retirées)\n" +
        "• 3 repas fixes : avoine + œufs / poulet + riz / dinde + patate douce\n" +
        "• L'historique des repas mangés est conservé\n\n" +
        "Cette action n'est pas réversible automatiquement.",
    );
    if (!ok) return;

    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/meal-plan/regenerate-simple", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg("Erreur : " + (json.error ?? res.statusText));
        return;
      }
      setMsg("✓ Plan régénéré");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>💡 Plan simple auto-généré</CardTitle>
      <p className="text-xs text-muted mb-3">
        Crée un plan minimaliste calé sur tes cibles macro actuelles :
        avoine · œufs · skyr · poulet · dinde · riz · patate douce · brocoli · salade ·
        huile d'olive · amandes · banane. Idéal si tu veux repartir d'une base claire.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={regenerate} disabled={busy}>
          {busy ? "Génération…" : "Régénérer un plan simple"}
        </Button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </Card>
  );
}
