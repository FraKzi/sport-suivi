"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, Field, Button } from "@/components/ui";
import { computeTargets, GOAL_LABEL } from "@/lib/macros";
import type { Goal, Sex, UserProfile } from "@prisma/client";

type Props = { initial: UserProfile | null };

export function ProfileForm({ initial }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>(initial?.displayName ?? "");
  const [age, setAge] = useState<number>(initial?.age ?? 25);
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "MALE");
  const [heightCm, setHeightCm] = useState<number>(initial?.heightCm ?? 180);
  const [weight, setWeight] = useState<number>(initial?.currentWeight ?? 75);
  const [tdee, setTdee] = useState<number>(initial?.tdee ?? 2500);
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "RECOMP");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const preview = computeTargets(weight, tdee, goal);

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName.trim() || null,
        age,
        sex,
        heightCm,
        currentWeight: weight,
        tdee,
        goal,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("✓ Profil enregistré");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg("Erreur : " + JSON.stringify(j));
    }
  }

  function estimateTdeeMifflin() {
    const bmr =
      sex === "MALE"
        ? 10 * weight + 6.25 * heightCm - 5 * age + 5
        : 10 * weight + 6.25 * heightCm - 5 * age - 161;
    setTdee(Math.round(bmr * 1.55));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Informations personnelles</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Prénom / pseudo" hint="Affiché sur le tableau de bord">
              <input
                type="text"
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ex: Lucas"
              />
            </Field>
          </div>
          <Field label="Âge">
            <input type="number" value={age} onChange={(e) => setAge(+e.target.value)} />
          </Field>
          <Field label="Sexe">
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="MALE">Homme</option>
              <option value="FEMALE">Femme</option>
            </select>
          </Field>
          <Field label="Taille (cm)">
            <input type="number" value={heightCm} onChange={(e) => setHeightCm(+e.target.value)} />
          </Field>
          <Field label="Poids actuel (kg)" hint="Synchronisé avec l'historique de poids">
            <input
              type="number"
              step={0.1}
              value={weight}
              onChange={(e) => setWeight(+e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Métabolisme & objectif</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="TDEE (kcal / jour)" hint="Tes besoins de maintien">
            <input type="number" value={tdee} onChange={(e) => setTdee(+e.target.value)} />
          </Field>
          <Field label="Objectif">
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
              {(["CUTTING", "RECOMP", "BULKING", "MAINTENANCE"] as Goal[]).map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABEL[g]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Button variant="ghost" onClick={estimateTdeeMifflin}>
            Estimer mon TDEE (Mifflin-St Jeor × 1.55)
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Aperçu — cibles macros calculées</CardTitle>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-surface2 rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Calories</div>
            <div className="text-xl font-semibold">{preview.kcal}</div>
            <div className="text-xs text-muted">kcal</div>
          </div>
          <div className="bg-surface2 rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Protéines</div>
            <div className="text-xl font-semibold">{preview.proteinG}</div>
            <div className="text-xs text-muted">g</div>
          </div>
          <div className="bg-surface2 rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Glucides</div>
            <div className="text-xl font-semibold">{preview.carbsG}</div>
            <div className="text-xs text-muted">g</div>
          </div>
          <div className="bg-surface2 rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Lipides</div>
            <div className="text-xl font-semibold">{preview.fatG}</div>
            <div className="text-xs text-muted">g</div>
          </div>
        </div>
        <p className="text-xs text-muted mt-3">
          Standards : sèche -20% TDEE / 2.4g·kg P / 0.8g·kg L · recomp = TDEE / 2.2g·kg P / 0.9g·kg L · prise +10% / 1.8g·kg P / 1.0g·kg L · maintien = TDEE / 1.6g·kg P / 1.0g·kg L (Helms / Schoenfeld).
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Sauvegarde…" : "Enregistrer"}
        </Button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}
