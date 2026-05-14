"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExerciseType, MuscleGroup } from "@prisma/client";
import { Card, CardTitle, Button, Field, Badge } from "@/components/ui";
import { MUSCLE_LABEL, ALL_MUSCLES } from "@/lib/programGenerator";

type Exo = {
  id: number;
  name: string;
  type: ExerciseType;
  primaryMuscle: MuscleGroup;
  dayNumber: number;
  orderIndex: number;
  prescription: string;
  description: string | null;
  notes: string | null;
};

export function ProgramEditClient({
  daysLabels,
  daysPerWeek,
  exercises: initial,
}: {
  daysLabels: string[];
  daysPerWeek: number;
  exercises: Exo[];
}) {
  const router = useRouter();
  const [exos, setExos] = useState<Exo[]>(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [adding, setAdding] = useState<number | null>(null); // dayNumber to add to

  async function patch(id: number, patch: Partial<Exo>) {
    setBusyId(id);
    const res = await fetch(`/api/program/exercises/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusyId(null);
    if (res.ok) {
      setExos((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    }
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cet exercice ? (archivé si historique existe)")) return;
    setBusyId(id);
    const res = await fetch(`/api/program/exercises/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      setExos((prev) => prev.filter((e) => e.id !== id));
    }
  }

  async function addCustom(form: NewExoForm, dayNumber: number) {
    const res = await fetch(`/api/program/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, dayNumber }),
    });
    if (res.ok) {
      const created = (await res.json()) as Exo;
      setExos((prev) => [...prev, created]);
      setAdding(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((day) => {
        const dayExos = exos.filter((e) => e.dayNumber === day);
        return (
          <Card key={day}>
            <div className="flex items-baseline justify-between mb-3">
              <CardTitle>
                Jour {day} — {daysLabels[day - 1] ?? ""}
              </CardTitle>
              <span className="text-xs text-muted">{dayExos.length} exos</span>
            </div>
            {dayExos.length === 0 ? (
              <p className="text-sm text-muted italic">Aucun exercice ce jour-là.</p>
            ) : (
              <ul className="divide-y divide-border">
                {dayExos.map((exo) => (
                  <ExerciseRow
                    key={exo.id}
                    exo={exo}
                    busy={busyId === exo.id}
                    onSave={(patch) => patch && patchExo(exo.id, patch, setExos, setBusyId)}
                    onPatch={(p) => patch(exo.id, p)}
                    onRemove={() => remove(exo.id)}
                  />
                ))}
              </ul>
            )}
            <div className="mt-3 flex justify-end">
              {adding === day ? (
                <NewExoCard
                  onCancel={() => setAdding(null)}
                  onSubmit={(form) => addCustom(form, day)}
                />
              ) : (
                <Button variant="ghost" onClick={() => setAdding(day)}>
                  + Ajouter un exercice
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

async function patchExo(
  _id: number,
  _patch: Partial<Exo>,
  _set: React.Dispatch<React.SetStateAction<Exo[]>>,
  _setBusy: React.Dispatch<React.SetStateAction<number | null>>,
) {
  // helper noop — onPatch est utilisé directement, ce wrapper était redondant
}

function ExerciseRow({
  exo,
  busy,
  onPatch,
  onRemove,
}: {
  exo: Exo;
  busy: boolean;
  onSave: (p?: Partial<Exo>) => void;
  onPatch: (p: Partial<Exo>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(exo.name);
  const [prescription, setPrescription] = useState(exo.prescription);
  const [notes, setNotes] = useState(exo.notes ?? "");
  const [dirty, setDirty] = useState(false);

  function save() {
    const patch: Partial<Exo> = {};
    if (name !== exo.name) patch.name = name;
    if (prescription !== exo.prescription) patch.prescription = prescription;
    if ((notes || null) !== exo.notes) patch.notes = notes || null;
    if (Object.keys(patch).length > 0) onPatch(patch);
    setDirty(false);
    setOpen(false);
  }

  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs text-muted tabular-nums">{exo.orderIndex}.</span>
            <span className="text-sm font-medium">{exo.name}</span>
            <Badge tone={exo.type === "POLY" ? "accent" : "default"}>{exo.type}</Badge>
            <span className="text-xs text-muted">{MUSCLE_LABEL[exo.primaryMuscle]}</span>
          </div>
          <div className="text-xs text-muted mt-0.5">{exo.prescription}</div>
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="text-xs text-danger hover:underline disabled:opacity-50"
        >
          Supprimer
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2.5 bg-surface2/50 border border-border rounded-md p-3">
          <Field label="Nom">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <Field label="Prescription" hint="Format libre, ex: 4×8-12 RPE 7-8">
            <input
              type="text"
              value={prescription}
              onChange={(e) => {
                setPrescription(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button onClick={save} disabled={!dirty || busy}>
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

type NewExoForm = {
  name: string;
  type: ExerciseType;
  primaryMuscle: MuscleGroup;
  prescription: string;
};

function NewExoCard({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (form: NewExoForm) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ExerciseType>("ISO");
  const [muscle, setMuscle] = useState<MuscleGroup>("CHEST");
  const [prescription, setPrescription] = useState("3×10-15");

  return (
    <div className="w-full bg-surface2/50 border border-border rounded-md p-3 space-y-2.5">
      <Field label="Nom">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as ExerciseType)}>
            <option value="POLY">POLY (compound)</option>
            <option value="ISO">ISO (isolation)</option>
          </select>
        </Field>
        <Field label="Muscle">
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
          >
            {ALL_MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Prescription">
        <input
          type="text"
          value={prescription}
          onChange={(e) => setPrescription(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          disabled={!name.trim()}
          onClick={() => onSubmit({ name: name.trim(), type, primaryMuscle: muscle, prescription })}
        >
          Créer
        </Button>
      </div>
    </div>
  );
}
