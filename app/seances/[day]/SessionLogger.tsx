"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, Field, Button, Badge } from "@/components/ui";
import type { Exercise } from "@prisma/client";

type LastSet = {
  exerciseId: number;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
};

type Props = {
  day: number;
  exercises: Exercise[];
  lastSession: { date: string; sets: LastSet[] } | null;
  defaultBodyWeight: number | null;
};

type SetRow = {
  exerciseId: number;
  setNumber: number;
  weightKg: string;
  reps: string;
  rpe: string;
  notes: string;
};

const DAY_TITLES: Record<number, string> = {
  1: "Jour 1 — Upper",
  2: "Jour 2 — Lower",
  3: "Jour 3 — Full Body",
};

function parseSetCount(prescription: string): number {
  // "4×5-8", "3×8-10", "3 séries", "3×8-10 / jambe"
  const m = prescription.match(/^(\d+)/);
  return m ? Math.min(6, parseInt(m[1], 10)) : 3;
}

export function SessionLogger({ day, exercises, lastSession, defaultBodyWeight }: Props) {
  const router = useRouter();

  const initialRows = useMemo<SetRow[]>(() => {
    const rows: SetRow[] = [];
    for (const e of exercises) {
      const count = parseSetCount(e.prescription);
      for (let i = 1; i <= count; i++) {
        const last = lastSession?.sets.find((s) => s.exerciseId === e.id && s.setNumber === i);
        rows.push({
          exerciseId: e.id,
          setNumber: i,
          weightKg: last?.weightKg != null ? String(last.weightKg) : "",
          reps: last?.reps != null ? String(last.reps) : "",
          rpe: last?.rpe != null ? String(last.rpe) : "",
          notes: "",
        });
      }
    }
    return rows;
  }, [exercises, lastSession]);

  const [rows, setRows] = useState<SetRow[]>(initialRows);
  const [bodyWeight, setBodyWeight] = useState<string>(
    defaultBodyWeight ? String(defaultBodyWeight) : ""
  );
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  function update(idx: number, key: keyof SetRow, val: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  }

  function addSet(exerciseId: number) {
    setRows((prev) => {
      const existing = prev.filter((r) => r.exerciseId === exerciseId);
      const next: SetRow = {
        exerciseId,
        setNumber: existing.length + 1,
        weightKg: "",
        reps: "",
        rpe: "",
        notes: "",
      };
      // insère à la suite du dernier set de cet exo
      const lastIdx = prev.map((r) => r.exerciseId).lastIndexOf(exerciseId);
      const arr = [...prev];
      arr.splice(lastIdx + 1, 0, next);
      return arr;
    });
  }

  function removeSet(idx: number) {
    setRows((prev) => {
      const target = prev[idx];
      const arr = prev.filter((_, i) => i !== idx);
      // renumérote les sets de cet exo
      let n = 1;
      return arr.map((r) =>
        r.exerciseId === target.exerciseId ? { ...r, setNumber: n++ } : r
      );
    });
  }

  async function save() {
    setSaving(true);
    setMsg("");

    const sets = rows
      .filter((r) => r.weightKg !== "" || r.reps !== "" || r.rpe !== "")
      .map((r) => ({
        exerciseId: r.exerciseId,
        setNumber: r.setNumber,
        weightKg: r.weightKg !== "" ? Number(r.weightKg) : null,
        reps: r.reps !== "" ? Number(r.reps) : null,
        rpe: r.rpe !== "" ? Number(r.rpe) : null,
        notes: r.notes || null,
      }));

    if (sets.length === 0) {
      setMsg("Renseigne au moins une série.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayNumber: day,
        bodyWeight: bodyWeight ? Number(bodyWeight) : null,
        durationMin: duration ? Number(duration) : null,
        notes: notes || null,
        sets,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/historique");
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg("Erreur : " + JSON.stringify(j));
    }
  }

  const lastDate = lastSession ? new Date(lastSession.date) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{DAY_TITLES[day]}</h1>
        {lastDate && (
          <span className="text-xs text-muted">
            Dernière fois :{" "}
            {lastDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Poids du jour (kg)">
            <input
              type="number"
              step={0.1}
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
            />
          </Field>
          <Field label="Durée (min)">
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="Notes générales">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optionnel" />
          </Field>
        </div>
      </Card>

      <div className="space-y-3">
        {exercises.map((e) => {
          const exoRows = rows
            .map((r, i) => ({ row: r, idx: i }))
            .filter(({ row }) => row.exerciseId === e.id);
          return (
            <Card key={e.id} className="!p-4">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="font-medium text-sm">
                    {e.orderIndex}. {e.name}
                  </div>
                  {e.description && (
                    <div className="text-xs text-muted mt-0.5">{e.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={e.type === "POLY" ? "accent" : "default"}>{e.type}</Badge>
                  <span className="text-xs text-muted">{e.prescription}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-[28px_1fr_1fr_70px_36px] gap-2 text-[11px] text-muted px-1">
                  <span>#</span>
                  <span>Charge (kg)</span>
                  <span>Reps</span>
                  <span>RPE</span>
                  <span></span>
                </div>
                {exoRows.map(({ row, idx }) => (
                  <div
                    key={`${e.id}-${idx}`}
                    className="grid grid-cols-[28px_1fr_1fr_70px_36px] gap-2 items-center"
                  >
                    <span className="text-sm text-muted text-center">{row.setNumber}</span>
                    <input
                      type="number"
                      step={0.5}
                      placeholder="kg"
                      value={row.weightKg}
                      onChange={(ev) => update(idx, "weightKg", ev.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="reps"
                      value={row.reps}
                      onChange={(ev) => update(idx, "reps", ev.target.value)}
                    />
                    <input
                      type="number"
                      step={0.5}
                      placeholder="–"
                      value={row.rpe}
                      onChange={(ev) => update(idx, "rpe", ev.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeSet(idx)}
                      className="text-danger hover:bg-danger/10 rounded text-xs"
                      aria-label="Supprimer la série"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSet(e.id)}
                  className="text-xs text-accent hover:underline mt-1"
                >
                  + Ajouter une série
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3 sticky bottom-2 bg-bg/80 backdrop-blur p-3 -mx-3 rounded-lg border border-border">
        <Button onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Terminer la séance"}
        </Button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}
