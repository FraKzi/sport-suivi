"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { ExerciseType } from "@prisma/client";
import { Card, CardTitle, Badge, Stat } from "@/components/ui";
import {
  allTimeBests,
  progressionPerSession,
  progressVs30Days,
  tonnageWindow,
  type RawSet,
} from "@/lib/progression";
import { assessStrength, percentTable } from "@/lib/lifting";

const DAY_LABEL: Record<number, string> = { 1: "Pull", 2: "Legs", 3: "Push" };

type Exo = {
  id: number;
  name: string;
  type: ExerciseType;
  dayNumber: number;
  prescription: string;
  description: string | null;
  muscleGroups: string | null;
  archived: boolean;
};

type Profile = { sex: "MALE" | "FEMALE"; bodyWeightKg: number } | null;

type Props = { exo: Exo; sets: RawSet[]; profile: Profile };

type Period = 30 | 90 | 180 | 365 | 0; // 0 = all time

const PERIOD_LABEL: Record<Period, string> = {
  30: "30 j",
  90: "3 mois",
  180: "6 mois",
  365: "1 an",
  0: "Tout",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function ProgressionView({ exo, sets, profile }: Props) {
  const [period, setPeriod] = useState<Period>(180);
  const [showPctTable, setShowPctTable] = useState(false);

  const filteredSets = useMemo(() => {
    if (period === 0) return sets;
    const cutoff = Date.now() - period * 86400_000;
    return sets.filter((s) => new Date(s.date).getTime() >= cutoff);
  }, [sets, period]);

  const sessions = useMemo(() => progressionPerSession(filteredSets), [filteredSets]);
  const allSessions = useMemo(() => progressionPerSession(sets), [sets]);
  const bests = useMemo(() => allTimeBests(sets), [sets]);
  const tonnage30j = useMemo(() => tonnageWindow(sets, 30), [sets]);
  const e1rmDelta = useMemo(() => progressVs30Days(allSessions), [allSessions]);

  const noData = sets.length === 0;

  // Datasets pour Recharts
  const e1rmData = sessions.map((s) => ({
    label: formatDate(s.isoDate),
    e1rm: Math.round(s.topE1RM * 10) / 10,
    date: s.date,
  }));
  const topWeightData = sessions.map((s) => ({
    label: formatDate(s.isoDate),
    poids: s.topWeight,
  }));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/exercices" className="text-xs text-muted hover:text-accent">
          ← Tous les exercices
        </Link>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mt-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight">{exo.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <Badge tone={exo.type === "POLY" ? "accent" : "default"}>{exo.type}</Badge>
              <span className="text-xs text-muted">
                Jour {exo.dayNumber} · {DAY_LABEL[exo.dayNumber]}
              </span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">{exo.prescription}</span>
              {exo.archived && <Badge tone="warning">Archivé</Badge>}
            </div>
            {exo.muscleGroups && (
              <div className="text-xs text-muted mt-1">{exo.muscleGroups}</div>
            )}
          </div>
        </div>
      </div>

      {noData ? (
        <Card>
          <p className="text-sm text-muted">
            Aucune série loguée pour cet exercice. Démarre une séance pour commencer à voir
            ta progression.
          </p>
        </Card>
      ) : (
        <>
          {/* Stats absolues (records all-time) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="Charge max"
              value={bests.topWeight ? bests.topWeight.value.toFixed(1) : "–"}
              unit="kg"
              hint={
                bests.topWeight
                  ? `${bests.topWeight.reps} reps · ${formatDate(bests.topWeight.date)}`
                  : undefined
              }
            />
            <Stat
              label="e1RM max"
              value={bests.topE1RM ? Math.round(bests.topE1RM.value).toString() : "–"}
              unit="kg"
              hint={
                bests.topE1RM
                  ? `${bests.topE1RM.weight} × ${bests.topE1RM.reps} · ${formatDate(bests.topE1RM.date)}`
                  : undefined
              }
            />
            <Stat
              label="Top volume"
              value={bests.topVolume ? Math.round(bests.topVolume.value).toString() : "–"}
              unit="kg"
              hint={
                bests.topVolume
                  ? `${bests.topVolume.weight} × ${bests.topVolume.reps} · ${formatDate(bests.topVolume.date)}`
                  : undefined
              }
            />
            <Stat
              label="Tonnage 30 j"
              value={Math.round(tonnage30j).toLocaleString("fr-FR")}
              unit="kg"
              hint={
                e1rmDelta != null
                  ? `e1RM ${e1rmDelta >= 0 ? "+" : ""}${e1rmDelta.toFixed(1)} kg vs 30j`
                  : undefined
              }
            />
          </div>

          {/* Strength standards (Bench/Squat/DL/OHP uniquement, vs ratio poids de corps) */}
          {(() => {
            if (!bests.topE1RM || !profile) return null;
            const assess = assessStrength({
              exerciseName: exo.name,
              e1RM: bests.topE1RM.value,
              bodyWeightKg: profile.bodyWeightKg,
              sex: profile.sex,
            });
            if (!assess) return null;
            const colors: Record<string, string> = {
              "Pré-débutant": "bg-muted text-bg",
              Débutant: "bg-danger text-white",
              Novice: "bg-warning text-bg",
              Intermédiaire: "bg-accent text-white",
              Avancé: "bg-success text-white",
              Élite: "bg-warning text-bg",
            };
            return (
              <Card>
                <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                  <CardTitle>
                    Niveau de force · {assess.exerciseLabel}
                  </CardTitle>
                  <Badge>
                    Ratio {assess.ratio.toFixed(2)}× PdC
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold ${colors[assess.level] ?? "bg-surface2"}`}
                  >
                    {assess.level}
                  </div>
                  {assess.nextLevel && (
                    <div className="text-xs text-muted">
                      Prochain palier : <strong className="text-text">{assess.nextLevel.label}</strong>{" "}
                      à {assess.nextLevel.weight} kg
                      {assess.nextLevel.delta > 0 && (
                        <span className="text-warning"> (+{assess.nextLevel.delta.toFixed(1)} kg)</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {assess.thresholds.map((t) => {
                    const reached = bests.topE1RM!.value >= t.weight;
                    const isCurrentLevel = t.label === assess.level;
                    return (
                      <div
                        key={t.label}
                        className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm py-1 px-2 rounded ${
                          isCurrentLevel ? "bg-accent/10 ring-1 ring-accent/30" : ""
                        }`}
                      >
                        <span
                          className={
                            reached
                              ? "text-text"
                              : "text-muted"
                          }
                        >
                          {reached ? "✓" : "○"} {t.label}
                        </span>
                        <span className="text-xs text-muted">×{t.ratio}</span>
                        <span className="tabular-nums text-sm">{t.weight} kg</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted mt-3">
                  Standards Symmetric Strength / Stronger By Science basés sur le ratio
                  e1RM / poids de corps ({profile.bodyWeightKg} kg).
                </p>
              </Card>
            );
          })()}

          {/* Table %1RM (toggleable) */}
          {bests.topE1RM && (
            <Card>
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <CardTitle>Charges de travail (% de l'e1RM)</CardTitle>
                <button
                  type="button"
                  onClick={() => setShowPctTable((v) => !v)}
                  className="text-xs text-accent hover:underline"
                >
                  {showPctTable ? "Masquer" : "Afficher"}
                </button>
              </div>
              {showPctTable && (
                <table className="w-full text-sm mt-3">
                  <thead className="text-xs text-muted">
                    <tr className="border-b border-border">
                      <th className="text-left font-normal py-1.5">% 1RM</th>
                      <th className="text-right font-normal py-1.5">Charge</th>
                      <th className="text-right font-normal py-1.5">Reps</th>
                      <th className="text-right font-normal py-1.5">Objectif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {percentTable(bests.topE1RM.value).map((r) => (
                      <tr key={r.pct} className="border-b border-border last:border-0">
                        <td className="py-1.5">{r.pct}%</td>
                        <td className="text-right py-1.5 tabular-nums font-medium">
                          {r.weight} kg
                        </td>
                        <td className="text-right py-1.5 text-muted">{r.repsRange}</td>
                        <td className="text-right py-1.5 text-muted">{r.goal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* Sélecteur de période */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold">Évolution</h2>
            <div className="flex gap-1 bg-surface2 rounded-lg p-1">
              {(Object.keys(PERIOD_LABEL) as unknown as Period[])
                .map((k) => Number(k) as Period)
                .map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPeriod(k)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                      period === k ? "bg-accent text-white" : "text-muted hover:text-text"
                    }`}
                  >
                    {PERIOD_LABEL[k]}
                  </button>
                ))}
            </div>
          </div>

          {sessions.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">
                Aucune donnée sur cette période. Élargis le filtre.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {/* e1RM line chart */}
              <Card className="!p-4">
                <CardTitle>e1RM estimé (Epley)</CardTitle>
                <div className="h-48 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={e1rmData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#272c34" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#8b91a0" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={20}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#8b91a0" }}
                        axisLine={false}
                        tickLine={false}
                        domain={["dataMin - 2", "dataMax + 2"]}
                        width={32}
                      />
                      <Tooltip
                        cursor={{ stroke: "#5b8def", strokeDasharray: "3 3" }}
                        contentStyle={{
                          background: "#14171c",
                          border: "1px solid #272c34",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [`${v} kg`, "e1RM"]}
                        labelStyle={{ color: "#8b91a0" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="e1rm"
                        stroke="#5b8def"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#5b8def" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted mt-2">
                  Indicateur unique de progression réelle, indépendant de la fourchette de reps.
                </p>
              </Card>

              {/* Top weight bar chart */}
              <Card className="!p-4">
                <CardTitle>Charge max par séance</CardTitle>
                <div className="h-48 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topWeightData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#272c34" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#8b91a0" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={20}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#8b91a0" }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: "#14171c",
                          border: "1px solid #272c34",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [`${v} kg`, "Top set"]}
                        labelStyle={{ color: "#8b91a0" }}
                      />
                      <Bar dataKey="poids" fill="#3fb37f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted mt-2">
                  Charge la plus lourde soulevée à chaque séance.
                </p>
              </Card>
            </div>
          )}

          {/* Sessions récentes */}
          <Card>
            <CardTitle>Dernières séances</CardTitle>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted">Aucune donnée sur la période.</p>
            ) : (
              <ul className="divide-y divide-border">
                {[...sessions]
                  .reverse()
                  .slice(0, 10)
                  .map((s) => (
                    <li key={s.date} className="py-2.5 flex items-baseline justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(s.isoDate).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {s.setsCount} série{s.setsCount > 1 ? "s" : ""} · top {s.topWeight} kg ×{" "}
                          {s.topWeightReps} · vol total {Math.round(s.totalVolume)} kg
                        </div>
                      </div>
                      <Badge tone="default">e1RM {Math.round(s.topE1RM)}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
