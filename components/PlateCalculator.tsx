"use client";
import { useEffect, useMemo, useState } from "react";
import { Field, Badge } from "./ui";
import { STANDARD_BARS, calcPlates } from "@/lib/lifting";

type Props = { defaultTarget?: number };

const PLATE_COLORS: Record<number, string> = {
  25: "bg-red-500",
  20: "bg-blue-500",
  15: "bg-yellow-500",
  10: "bg-green-500",
  5: "bg-white text-bg",
  2.5: "bg-zinc-400",
  1.25: "bg-zinc-300 text-bg",
};

export function PlateCalculator({ defaultTarget }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(
    defaultTarget != null ? String(defaultTarget) : "",
  );
  const [barWeight, setBarWeight] = useState<number>(20);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const targetNum = parseFloat(target);
  const breakdown = useMemo(() => {
    if (!Number.isFinite(targetNum)) return null;
    return calcPlates(targetNum, barWeight);
  }, [targetNum, barWeight]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-md bg-surface2 hover:bg-accent hover:text-white border border-border transition-colors"
        title="Calculateur de disques"
      >
        🏋 Plates
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Calculateur de disques"
        >
          <div
            className="bg-surface border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">🏋 Calculateur de disques</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-text text-lg"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Poids cible (kg)">
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  max={500}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  autoFocus
                  placeholder="ex: 80"
                />
              </Field>
              <Field label="Barre">
                <select
                  value={barWeight}
                  onChange={(e) => setBarWeight(Number(e.target.value))}
                >
                  {STANDARD_BARS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {!Number.isFinite(targetNum) ? (
              <div className="text-sm text-muted text-center py-4">
                Entre un poids cible.
              </div>
            ) : breakdown === null ? (
              <div className="text-sm text-danger text-center py-4">
                Cible plus légère que la barre ({barWeight} kg).
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center py-2 bg-surface2 rounded-lg">
                  <div className="text-xs text-muted">Atteint</div>
                  <div className="text-3xl font-bold tabular-nums">
                    {breakdown.achieved} kg
                    {!breakdown.exact && (
                      <span className="text-xs text-warning font-normal ml-2">
                        (cible {targetNum})
                      </span>
                    )}
                  </div>
                  {!breakdown.exact && (
                    <div className="text-[11px] text-warning mt-0.5">
                      Pas atteignable exactement avec les disques standards
                    </div>
                  )}
                </div>

                {breakdown.perSide.length === 0 ? (
                  <div className="text-sm text-muted text-center py-3">
                    Barre seule, aucun disque à charger.
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-muted text-center">
                      Par côté · {breakdown.perSide.length} disque
                      {breakdown.perSide.length > 1 ? "s" : ""}
                    </div>
                    {/* Visu disques en pile (du plus gros au plus petit) */}
                    <div className="flex items-end justify-center gap-1.5 py-2 min-h-[80px]">
                      {breakdown.perSide.map((p, i) => (
                        <div
                          key={i}
                          className={`${PLATE_COLORS[p] ?? "bg-zinc-500"} text-[10px] font-bold rounded shadow flex items-center justify-center`}
                          style={{
                            width: 28 + p * 1.5,
                            height: 12 + p * 1.8,
                          }}
                          title={`${p} kg`}
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {/* Comptage condensé */}
                      {(() => {
                        const counts = new Map<number, number>();
                        for (const p of breakdown.perSide) {
                          counts.set(p, (counts.get(p) ?? 0) + 1);
                        }
                        return [...counts.entries()].map(([p, n]) => (
                          <Badge key={p}>
                            {n} × {p} kg
                          </Badge>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted">
              Disques standards : 25 / 20 / 15 / 10 / 5 / 2.5 / 1.25 kg.
              Algorithme glouton décroissant.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
