"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, Field, Button, Badge } from "@/components/ui";
import { PlateCalculator } from "@/components/PlateCalculator";
import type { Exercise } from "@prisma/client";
import { isPR } from "@/lib/gamification";
import {
  REST_SECONDS_BY_TYPE,
  computeLoadSuggestion,
  formatRemaining,
  type LoadSuggestion,
} from "@/lib/training";

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
  bestVolumes: Record<number, number>;
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
  1: "Pull — Dos / Biceps",
  2: "Legs — Jambes",
  3: "Push — Pecs / Épaules / Triceps",
};

function parseSetCount(prescription: string): number {
  // "4×5-8", "3×8-10", "3 séries", "3×8-10 / jambe"
  const m = prescription.match(/^(\d+)/);
  return m ? Math.min(6, parseInt(m[1], 10)) : 3;
}

export function SessionLogger({ day, exercises, lastSession, defaultBodyWeight, bestVolumes }: Props) {
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

  // ===== TIMER DE REPOS =====
  type RestState = {
    exerciseId: number;
    exerciseName: string;
    duration: number; // secondes
    endsAt: number; // epoch ms
  } | null;
  const [rest, setRest] = useState<RestState>(null);
  const [now, setNow] = useState(Date.now());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef<number>(0);

  // Tick toutes les secondes quand un timer tourne
  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [rest]);

  // Bip + vibration quand le timer arrive à zéro
  useEffect(() => {
    if (!rest) return;
    const remaining = (rest.endsAt - now) / 1000;
    if (remaining <= 0 && lastBeepRef.current !== rest.endsAt) {
      lastBeepRef.current = rest.endsAt;
      playBeep();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([200, 80, 200]);
      }
    }
  }, [rest, now]);

  function playBeep() {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      // 2 bips courts à 880 Hz
      [0, 0.25].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.2);
      });
    } catch {
      /* audio non dispo, ignore */
    }
  }

  function startRest(exerciseId: number) {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    const seconds = REST_SECONDS_BY_TYPE[ex.type];
    setRest({
      exerciseId,
      exerciseName: ex.name,
      duration: seconds,
      endsAt: Date.now() + seconds * 1000,
    });
    setNow(Date.now());
    // Init AudioContext sur user gesture (politique navigateur)
    if (!audioCtxRef.current) {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      } catch {}
    }
  }

  function adjustRest(deltaSec: number) {
    if (!rest) return;
    setRest({ ...rest, endsAt: Math.max(Date.now(), rest.endsAt + deltaSec * 1000) });
  }

  function skipRest() {
    setRest(null);
  }

  // ===== SUGGESTIONS DE CHARGE =====
  const suggestionByExerciseId = useMemo(() => {
    const map: Record<number, LoadSuggestion | null> = {};
    if (!lastSession) return map;
    for (const e of exercises) {
      const sets = lastSession.sets
        .filter((s) => s.exerciseId === e.id)
        .map((s) => ({ weightKg: s.weightKg, reps: s.reps, rpe: s.rpe }));
      map[e.id] = computeLoadSuggestion(sets, e.prescription, e.type);
    }
    return map;
  }, [exercises, lastSession]);

  function applySuggestion(exerciseId: number, kg: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.exerciseId === exerciseId ? { ...r, weightKg: String(kg) } : r,
      ),
    );
  }

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

  // Compteur de PR potentiels sur la séance en cours
  const prCount = useMemo(() => {
    let count = 0;
    for (const r of rows) {
      const w = Number(r.weightKg);
      const reps = Number(r.reps);
      if (Number.isFinite(w) && Number.isFinite(reps) && isPR(w, reps, bestVolumes[r.exerciseId])) {
        count++;
      }
    }
    return count;
  }, [rows, bestVolumes]);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold">{DAY_TITLES[day]}</h1>
          {prCount > 0 && (
            <Badge tone="warning">
              ⭐ {prCount} PR potentiel{prCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PlateCalculator />
          {lastDate && (
            <span className="text-xs text-muted">
              Dernière fois :{" "}
              {lastDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
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
            <Card key={e.id} className="!p-4 space-y-3">
              <div>
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="font-semibold text-sm leading-tight">
                    <span className="text-muted mr-1">{e.orderIndex}.</span>
                    {e.name}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={e.type === "POLY" ? "accent" : "default"}>{e.type}</Badge>
                    <span className="text-xs text-muted">{e.prescription}</span>
                  </div>
                </div>
                {e.muscleGroups && (
                  <div className="text-[11px] text-muted mt-1">{e.muscleGroups}</div>
                )}
                {e.description && (
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">{e.description}</p>
                )}
                {(() => {
                  const sug = suggestionByExerciseId[e.id];
                  if (!sug) {
                    return (
                      <div className="text-[11px] text-muted mt-2 italic">
                        💡 Première fois sur cet exo — pars léger pour valider la technique.
                      </div>
                    );
                  }
                  const tone =
                    sug.tone === "up"
                      ? "bg-success/15 text-success border-success/30"
                      : sug.tone === "deload"
                      ? "bg-danger/15 text-danger border-danger/30"
                      : "bg-surface2 text-muted border-border";
                  return (
                    <button
                      type="button"
                      onClick={() => applySuggestion(e.id, sug.kg)}
                      className={`mt-2 inline-flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-full border transition-colors hover:brightness-110 ${tone}`}
                      title={sug.reason}
                    >
                      <span>💡</span>
                      <span className="font-medium">
                        Essaie {sug.kg} kg{" "}
                        <span className="opacity-70">({sug.label})</span>
                      </span>
                    </button>
                  );
                })()}
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-[28px_1fr_1fr_70px_30px_30px] gap-2 text-[11px] text-muted px-1">
                  <span>#</span>
                  <span>Charge (kg)</span>
                  <span>Reps</span>
                  <span>RPE</span>
                  <span></span>
                  <span></span>
                </div>
                {exoRows.map(({ row, idx }) => {
                  const w = Number(row.weightKg);
                  const reps = Number(row.reps);
                  const rowIsPR =
                    Number.isFinite(w) &&
                    Number.isFinite(reps) &&
                    isPR(w, reps, bestVolumes[row.exerciseId]);
                  const canStartRest = w > 0 && reps > 0;
                  return (
                    <div
                      key={`${e.id}-${idx}`}
                      className={`grid grid-cols-[28px_1fr_1fr_70px_30px_30px] gap-2 items-center rounded px-1 -mx-1 transition-colors ${
                        rowIsPR ? "bg-warning/10 ring-1 ring-warning/40" : ""
                      }`}
                    >
                      <span className="text-sm text-center">
                        {rowIsPR ? (
                          <span
                            className="text-warning text-base inline-block"
                            title="Nouveau PR potentiel !"
                            aria-label="Personal record"
                          >
                            ⭐
                          </span>
                        ) : (
                          <span className="text-muted">{row.setNumber}</span>
                        )}
                      </span>
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
                        onClick={() => startRest(e.id)}
                        disabled={!canStartRest}
                        className="text-success hover:bg-success/10 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Série faite — démarrer le repos"
                        title={canStartRest ? "Série faite — démarrer le repos" : "Renseigne charge & reps"}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSet(idx)}
                        className="text-danger hover:bg-danger/10 rounded text-xs"
                        aria-label="Supprimer la série"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
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

      <div className="flex items-center gap-3 sticky bottom-24 bg-bg/80 backdrop-blur p-3 -mx-3 rounded-lg border border-border">
        <Button onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Terminer la séance"}
        </Button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>

      {/* Timer de repos flottant */}
      {rest && (() => {
        const remaining = Math.max(0, (rest.endsAt - now) / 1000);
        const overtime = remaining === 0;
        const pct = overtime ? 0 : (remaining / rest.duration) * 100;
        return (
          <div className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-96 bottom-44 z-40 animate-fadeIn">
            <div
              className={`rounded-xl shadow-2xl border p-3 backdrop-blur ${
                overtime
                  ? "bg-success/95 border-success text-white"
                  : "bg-accent/95 border-accent text-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide opacity-80 truncate">
                    {overtime ? "Repos terminé" : "Repos en cours"} · {rest.exerciseName}
                  </div>
                  <div className="text-3xl font-bold tabular-nums leading-tight">
                    {overtime ? "Go !" : formatRemaining(remaining)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => adjustRest(-30)}
                    disabled={overtime}
                    className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-xs font-medium disabled:opacity-40"
                  >
                    −30s
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustRest(30)}
                    className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-xs font-medium"
                  >
                    +30s
                  </button>
                  <button
                    type="button"
                    onClick={skipRest}
                    className="px-2.5 py-1 rounded-md bg-white/25 hover:bg-white/40 text-xs font-medium"
                    aria-label="Fermer le timer"
                  >
                    {overtime ? "OK" : "Skip"}
                  </button>
                </div>
              </div>
              <div className="h-1 bg-white/30 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-1000 ease-linear"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
