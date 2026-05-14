"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MuscleGroup, MusclePriorityLevel, SplitType } from "@prisma/client";
import { Card, CardTitle, Button } from "@/components/ui";
import { ALL_MUSCLES, SPLIT_LABEL, SPLIT_DAYS_LABELS } from "@/lib/programGenerator";
import { MusclePrioritiesDnD } from "@/components/MusclePrioritiesDnD";

const SPLITS: SplitType[] = ["PPL_3", "UL_4", "PPL_UL_5", "PPL_6"];

function defaultPriorities(): Record<MuscleGroup, MusclePriorityLevel> {
  const out = {} as Record<MuscleGroup, MusclePriorityLevel>;
  for (const m of ALL_MUSCLES) out[m] = "MODERATE";
  return out;
}

export function OnboardingClient({
  initialSplit = "PPL_3" as SplitType,
  initialPriorities,
  redirectTo = "/",
  submitLabel = "Générer mon programme",
}: {
  initialSplit?: SplitType;
  initialPriorities?: Record<MuscleGroup, MusclePriorityLevel>;
  redirectTo?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [split, setSplit] = useState<SplitType>(initialSplit);
  const [priorities, setPriorities] = useState<Record<MuscleGroup, MusclePriorityLevel>>(
    initialPriorities ?? defaultPriorities(),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/program/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ split, priorities }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Erreur lors de la génération");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Choix du split */}
      <Card>
        <CardTitle>1. Combien de jours par semaine ?</CardTitle>
        <p className="text-xs text-muted mb-3">
          Helms recommande une fréquence de 2× par muscle pour optimiser la
          synthèse protéique. Plus tu as de jours, plus tu peux distribuer le
          volume sans surcharger une session.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {SPLITS.map((s) => {
            const isActive = split === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSplit(s)}
                className={`text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                  isActive
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:border-muted/60"
                }`}
              >
                <div className="font-medium text-sm">{SPLIT_LABEL[s]}</div>
                <div className="text-xs text-muted mt-1">
                  {SPLIT_DAYS_LABELS(s).join(" / ")}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Priorités */}
      <Card>
        <CardTitle>2. Tes priorités musculaires</CardTitle>
        <p className="text-xs text-muted mb-4">
          Déplace chaque groupe musculaire dans la colonne correspondante. Les
          muscles privilégiés reçoivent plus de volume (~17 sets/sem), les
          modérés sont sur une trajectoire de progression standard (~12), les
          maintenus conservent leur niveau (~8).
        </p>
        <MusclePrioritiesDnD value={priorities} onChange={setPriorities} />
      </Card>

      {err && <p className="text-danger text-sm">{err}</p>}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy} className="px-6 py-3">
          {busy ? "Génération…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
