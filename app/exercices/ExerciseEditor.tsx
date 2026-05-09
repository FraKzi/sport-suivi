"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Exercise, ExerciseType } from "@prisma/client";
import { Card, CardTitle, Field, Button, Badge } from "@/components/ui";

type Props = { active: Exercise[]; archived: Exercise[] };

const DAY_LABEL: Record<number, string> = { 1: "Pull", 2: "Legs", 3: "Push" };

type FormState = {
  id: number | null; // null en création
  name: string;
  type: ExerciseType;
  dayNumber: number;
  prescription: string;
  description: string;
  muscleGroups: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  type: "POLY",
  dayNumber: 1,
  prescription: "3×8-12",
  description: "",
  muscleGroups: "",
};

export function ExerciseEditor({ active, archived }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const byDay = useMemo(() => {
    const map: Record<number, Exercise[]> = { 1: [], 2: [], 3: [] };
    for (const e of active) (map[e.dayNumber] ??= []).push(e);
    return map;
  }, [active]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function openCreate(dayNumber: number) {
    setMsg("");
    setEditing({ ...EMPTY_FORM, dayNumber });
  }

  function openEdit(exo: Exercise) {
    setMsg("");
    setEditing({
      id: exo.id,
      name: exo.name,
      type: exo.type,
      dayNumber: exo.dayNumber,
      prescription: exo.prescription,
      description: exo.description ?? "",
      muscleGroups: exo.muscleGroups ?? "",
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setMsg("Le nom est obligatoire.");
      return;
    }
    if (!editing.prescription.trim()) {
      setMsg("La prescription est obligatoire.");
      return;
    }
    setBusy(true);
    setMsg("");
    const payload = {
      name: editing.name.trim(),
      type: editing.type,
      dayNumber: editing.dayNumber,
      prescription: editing.prescription.trim(),
      description: editing.description.trim() || null,
      muscleGroups: editing.muscleGroups.trim() || null,
    };
    try {
      const res =
        editing.id == null
          ? await fetch("/api/exercises", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/exercises/${editing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg("Erreur : " + (j.error?.toString?.() ?? JSON.stringify(j)));
        setBusy(false);
        return;
      }
      setEditing(null);
      refresh();
    } catch (e: any) {
      setMsg("Erreur réseau : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function archiveExo(id: number) {
    if (!confirm("Archiver cet exercice ? Il disparaîtra du programme actif mais ton historique sera préservé.")) return;
    setBusy(true);
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
    setBusy(false);
    refresh();
  }

  async function unarchive(id: number) {
    setBusy(true);
    await fetch(`/api/exercises/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    setBusy(false);
    refresh();
  }

  async function move(id: number, direction: -1 | 1, day: number) {
    const list = byDay[day];
    if (!list) return;
    const idx = list.findIndex((e) => e.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;

    const a = list[idx];
    const b = list[swapIdx];
    setBusy(true);
    // Échange des orderIndex
    await Promise.all([
      fetch(`/api/exercises/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIndex: b.orderIndex }),
      }),
      fetch(`/api/exercises/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIndex: a.orderIndex }),
      }),
    ]);
    setBusy(false);
    refresh();
  }

  // Ferme le formulaire avec Escape
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditing(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing]);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Exercices</h1>
          <p className="text-sm text-muted mt-1">
            Modifie ton programme : ajoute, renomme, change la prescription, archive.
          </p>
        </div>
        {archived.length > 0 && (
          <Button variant="ghost" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Masquer archivés" : `Archivés (${archived.length})`}
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((d) => (
          <Card key={d}>
            <div className="flex items-baseline justify-between mb-3">
              <CardTitle>Jour {d} — {DAY_LABEL[d]}</CardTitle>
              <button
                type="button"
                onClick={() => openCreate(d)}
                className="text-xs bg-accent hover:bg-accent/90 text-white px-2.5 py-1 rounded-md"
              >
                + Ajouter
              </button>
            </div>

            {(byDay[d] ?? []).length === 0 ? (
              <p className="text-xs text-muted italic">Aucun exercice. Ajoute-en un.</p>
            ) : (
              <ul className="space-y-1.5">
                {byDay[d].map((exo, idx) => (
                  <li
                    key={exo.id}
                    className="bg-surface2 border border-border rounded-lg p-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium leading-tight">
                            {exo.name}
                          </span>
                          <Badge tone={exo.type === "POLY" ? "accent" : "default"}>
                            {exo.type}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted mt-0.5">
                          {exo.prescription}
                          {exo.muscleGroups ? ` · ${exo.muscleGroups}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => move(exo.id, -1, d)}
                          disabled={idx === 0 || busy}
                          className="text-muted hover:text-text disabled:opacity-30 px-1 text-xs"
                          aria-label="Monter"
                          title="Monter"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => move(exo.id, 1, d)}
                          disabled={idx === byDay[d].length - 1 || busy}
                          className="text-muted hover:text-text disabled:opacity-30 px-1 text-xs"
                          aria-label="Descendre"
                          title="Descendre"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(exo)}
                          className="text-accent hover:bg-accent/10 rounded px-1.5 text-xs"
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveExo(exo.id)}
                          disabled={busy}
                          className="text-danger hover:bg-danger/10 rounded px-1.5 text-xs"
                          aria-label="Archiver"
                          title="Archiver"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {showArchived && archived.length > 0 && (
        <Card>
          <CardTitle>Exercices archivés</CardTitle>
          <p className="text-xs text-muted mb-3">
            Conservés pour l'historique. Tu peux les restaurer dans le programme actif.
          </p>
          <ul className="divide-y divide-border">
            {archived.map((exo) => (
              <li
                key={exo.id}
                className="py-2 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm">{exo.name}</div>
                  <div className="text-[11px] text-muted">
                    Jour {exo.dayNumber} · {exo.type} · {exo.prescription}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => unarchive(exo.id)} disabled={busy}>
                  Restaurer
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Modal édition / création */}
      {editing && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setEditing(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-surface border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">
                {editing.id == null ? "Nouvel exercice" : "Modifier l'exercice"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-muted hover:text-text text-lg"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <Field label="Nom">
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="ex: Tractions lestées"
                maxLength={100}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value as ExerciseType })}
                >
                  <option value="POLY">POLY (poly-articulaire)</option>
                  <option value="ISO">ISO (isolation)</option>
                </select>
              </Field>
              <Field label="Jour">
                <select
                  value={editing.dayNumber}
                  onChange={(e) =>
                    setEditing({ ...editing, dayNumber: Number(e.target.value) })
                  }
                >
                  <option value={1}>1 — Pull</option>
                  <option value={2}>2 — Legs</option>
                  <option value={3}>3 — Push</option>
                </select>
              </Field>
            </div>

            <Field label="Prescription" hint="ex: 4×8-12, 3×6-8, 3 séries">
              <input
                type="text"
                value={editing.prescription}
                onChange={(e) => setEditing({ ...editing, prescription: e.target.value })}
                maxLength={50}
              />
            </Field>

            <Field label="Muscles ciblés" hint="optionnel">
              <input
                type="text"
                value={editing.muscleGroups}
                onChange={(e) => setEditing({ ...editing, muscleGroups: e.target.value })}
                placeholder="ex: Dos · Biceps"
                maxLength={100}
              />
            </Field>

            <Field label="Description" hint="optionnel · timestamps vidéo, conseils technique…">
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
            </Field>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button onClick={save} disabled={busy}>
                {busy ? "Sauvegarde…" : editing.id == null ? "Créer" : "Enregistrer"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              {msg && <span className="text-xs text-danger">{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
