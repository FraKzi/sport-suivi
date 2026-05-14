"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, Field, Button } from "@/components/ui";

type Props = {
  // Override stockés (null = auto-calculé)
  waterTargetMl: number | null;
  stepsTarget: number | null;
  // Valeurs auto-calculées pour servir d'indication / de placeholder
  autoWaterTargetMl: number;
  autoStepsTarget: number;
};

export function GoalsSection({
  waterTargetMl,
  stepsTarget,
  autoWaterTargetMl,
  autoStepsTarget,
}: Props) {
  const router = useRouter();
  const [water, setWater] = useState<string>(
    waterTargetMl != null ? String(waterTargetMl) : "",
  );
  const [steps, setSteps] = useState<string>(
    stepsTarget != null ? String(stepsTarget) : "",
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const waterIsCustom = waterTargetMl != null;
  const stepsIsCustom = stepsTarget != null;

  async function save() {
    setBusy(true);
    setMsg("");
    const payload: { waterTargetMl?: number | null; stepsTarget?: number | null } = {};
    payload.waterTargetMl = water.trim() === "" ? null : Number(water);
    payload.stepsTarget = steps.trim() === "" ? null : Number(steps);
    const res = await fetch("/api/profile/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(typeof j.error === "string" ? j.error : "Erreur lors de l'enregistrement");
      return;
    }
    setMsg("✓ Enregistré");
    router.refresh();
  }

  async function reset() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/profile/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waterTargetMl: null, stepsTarget: null }),
    });
    setBusy(false);
    if (res.ok) {
      setWater("");
      setSteps("");
      setMsg("✓ Réinitialisé");
      router.refresh();
    } else {
      setMsg("Erreur");
    }
  }

  return (
    <Card>
      <CardTitle>🎯 Mes objectifs quotidiens</CardTitle>
      <p className="text-xs text-muted mb-4">
        Personnalise tes cibles d&apos;hydratation et de pas. Laisse vide pour
        utiliser les valeurs calculées automatiquement.
      </p>
      <div className="space-y-3">
        <Field
          label="Hydratation (ml)"
          hint={
            waterIsCustom
              ? `Personnalisé · auto = ${autoWaterTargetMl} ml (35 ml/kg)`
              : `Auto-calculé à ${autoWaterTargetMl} ml (35 ml/kg de poids). +500 ml les jours d'entraînement.`
          }
        >
          <input
            type="number"
            min={500}
            max={10000}
            step={50}
            placeholder={`auto · ${autoWaterTargetMl}`}
            value={water}
            onChange={(e) => setWater(e.target.value)}
          />
        </Field>
        <Field
          label="Pas quotidiens"
          hint={
            stepsIsCustom
              ? `Personnalisé · défaut = ${autoStepsTarget.toLocaleString("fr-FR")}`
              : `Défaut à ${autoStepsTarget.toLocaleString("fr-FR")} pas/jour`
          }
        >
          <input
            type="number"
            min={1000}
            max={100000}
            step={500}
            placeholder={`auto · ${autoStepsTarget}`}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
        </Field>
      </div>
      {msg && <p className="text-xs text-muted mt-3">{msg}</p>}
      <div className="flex gap-2 mt-4">
        <Button onClick={save} disabled={busy}>
          {busy ? "…" : "Enregistrer"}
        </Button>
        {(waterIsCustom || stepsIsCustom) && (
          <Button variant="ghost" onClick={reset} disabled={busy}>
            Remettre par défaut
          </Button>
        )}
      </div>
    </Card>
  );
}
