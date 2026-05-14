"use client";

import { useState } from "react";
import Link from "next/link";
import type { MuscleGroup, MusclePriorityLevel, SplitType } from "@prisma/client";
import { Card, CardTitle, Button, Badge } from "@/components/ui";
import { MUSCLE_LABEL, PRIORITY_LABEL, ALL_MUSCLES } from "@/lib/programGenerator";
import { OnboardingClient } from "@/app/onboarding/OnboardingClient";

type ProgramSummary = {
  id: number;
  splitLabel: string;
  split: SplitType;
  daysPerWeek: number;
  daysLabels: string[];
  createdAt: string;
  exercisesCount: number;
  priorities: Partial<Record<MuscleGroup, MusclePriorityLevel>>;
};

export function ProgramSection({ program }: { program: ProgramSummary | null }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    const initialPrios = {} as Record<MuscleGroup, MusclePriorityLevel>;
    for (const m of ALL_MUSCLES) initialPrios[m] = program?.priorities[m] ?? "MODERATE";
    return (
      <Card>
        <div className="flex items-baseline justify-between mb-3">
          <CardTitle>🔁 Regénérer le programme</CardTitle>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-muted hover:text-text"
          >
            Annuler
          </button>
        </div>
        <p className="text-xs text-warning mb-4">
          ⚠ Génère un nouveau programme. L&apos;ancien sera désactivé mais
          l&apos;historique des séances reste intact.
        </p>
        <OnboardingClient
          initialSplit={program?.split ?? "PPL_3"}
          initialPriorities={initialPrios}
          redirectTo="/profil"
          submitLabel="Remplacer mon programme"
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>🏋 Programme</CardTitle>
      {program ? (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium">{program.splitLabel}</div>
            <div className="text-xs text-muted mt-0.5">
              {program.daysLabels.join(" / ")} · {program.exercisesCount} exercices
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1.5">Priorités musculaires</div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MUSCLES.map((m) => {
                const p = program.priorities[m];
                if (!p || p === "MODERATE") return null;
                const tone = p === "EMPHASIZED" ? "warning" : "default";
                return (
                  <Badge key={m} tone={tone as "warning" | "default"}>
                    {MUSCLE_LABEL[m]} · {PRIORITY_LABEL[p].toLowerCase()}
                  </Badge>
                );
              })}
              {Object.values(program.priorities).every((p) => p === "MODERATE") && (
                <span className="text-xs text-muted italic">
                  Toutes les priorités sont sur Modérée
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            <Link
              href="/profil/programme"
              className="text-sm bg-surface2 hover:bg-surface2/70 border border-border px-3 py-2 rounded-md"
            >
              ✏ Modifier les exercices
            </Link>
            <Button onClick={() => setEditing(true)} variant="ghost">
              🔁 Regénérer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Aucun programme actif. Configure-en un pour démarrer.
          </p>
          <Button onClick={() => setEditing(true)}>Générer un programme</Button>
        </div>
      )}
    </Card>
  );
}
