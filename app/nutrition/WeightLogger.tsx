"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/components/ui";

type WeightEntry = { id: number; date: string; weightKg: number };

export function WeightLogger({ recent }: { recent: WeightEntry[] }) {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!weight) return;
    setSaving(true);
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg: Number(weight) }),
    });
    setSaving(false);
    if (res.ok) {
      setWeight("");
      router.refresh();
    }
  }

  async function del(id: number) {
    if (!confirm("Supprimer cette mesure ?")) return;
    const res = await fetch(`/api/weight/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2 items-end">
        <Field label="Nouvelle mesure (kg)">
          <input
            type="number"
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="ex: 75.4"
          />
        </Field>
        <Button onClick={add} disabled={saving || !weight}>
          {saving ? "…" : "Ajouter"}
        </Button>
      </div>
      <div className="mt-3 max-h-48 overflow-y-auto">
        {recent.length === 0 ? (
          <p className="text-xs text-muted">Aucune mesure.</p>
        ) : (
          <ul className="text-sm divide-y divide-border">
            {recent.map((w) => (
              <li key={w.id} className="py-1.5 flex items-baseline justify-between">
                <span className="text-muted text-xs">
                  {new Date(w.date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="tabular-nums">{w.weightKg.toFixed(1)} kg</span>
                <button
                  onClick={() => del(w.id)}
                  className="text-xs text-muted hover:text-danger ml-2"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
