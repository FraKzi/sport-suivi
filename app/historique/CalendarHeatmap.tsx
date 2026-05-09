"use client";
import { useMemo } from "react";
import { Card, CardTitle } from "@/components/ui";

type SetDate = { date: string };
type Props = { sets: SetDate[] };

const DAYS_TO_SHOW = 365;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function intensityClass(count: number): string {
  if (count === 0) return "bg-surface2 border border-border/50";
  if (count <= 5) return "bg-success/30";
  if (count <= 15) return "bg-success/60";
  if (count <= 25) return "bg-success/85";
  return "bg-success";
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_LABELS = [
  "jan",
  "fév",
  "mar",
  "avr",
  "mai",
  "jui",
  "jul",
  "aoû",
  "sep",
  "oct",
  "nov",
  "déc",
];

export function CalendarHeatmap({ sets }: Props) {
  const { cells, monthLabels, totalDays, totalSets } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - (DAYS_TO_SHOW - 1));

    // Aligne le début sur le lundi (semaine commençant lundi en France)
    const startOfWeek = new Date(cutoff);
    const dow = (cutoff.getDay() + 6) % 7; // 0=lundi … 6=dimanche
    startOfWeek.setDate(startOfWeek.getDate() - dow);

    // Compte des séries par jour calendaire
    const setsByDay = new Map<string, number>();
    let total = 0;
    for (const s of sets) {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      if (d >= cutoff && d <= today) {
        const key = ymd(d);
        setsByDay.set(key, (setsByDay.get(key) ?? 0) + 1);
        total++;
      }
    }

    // Génère les cellules de startOfWeek à today
    const cells: { key: string; count: number; inRange: boolean; date: Date }[] = [];
    const d = new Date(startOfWeek);
    while (d <= today) {
      const key = ymd(d);
      const inRange = d >= cutoff;
      cells.push({
        key,
        count: inRange ? setsByDay.get(key) ?? 0 : 0,
        inRange,
        date: new Date(d),
      });
      d.setDate(d.getDate() + 1);
    }

    // Labels de mois : on prend la première cellule de chaque mois
    const seenMonths = new Set<number>();
    const monthLabels: { weekIdx: number; label: string }[] = [];
    cells.forEach((c, idx) => {
      if (!c.inRange) return;
      const m = c.date.getMonth();
      const y = c.date.getFullYear();
      const key = y * 12 + m;
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        monthLabels.push({
          weekIdx: Math.floor(idx / 7),
          label: MONTH_LABELS[m],
        });
      }
    });

    return {
      cells,
      monthLabels,
      totalDays: setsByDay.size,
      totalSets: total,
    };
  }, [sets]);

  const numWeeks = Math.ceil(cells.length / 7);

  return (
    <Card>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <CardTitle>Activité sur l'année</CardTitle>
        <span className="text-xs text-muted tabular-nums">
          {totalDays} jour{totalDays > 1 ? "s" : ""} actif
          {totalDays > 1 ? "s" : ""} · {totalSets.toLocaleString("fr-FR")} série
          {totalSets > 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <div className="inline-block min-w-full">
          {/* Mois */}
          <div
            className="grid mb-1 text-[10px] text-muted"
            style={{
              gridTemplateColumns: `16px repeat(${numWeeks}, 12px)`,
              gap: 2,
            }}
          >
            <span></span>
            {Array.from({ length: numWeeks }).map((_, w) => {
              const lbl = monthLabels.find((m) => m.weekIdx === w);
              return (
                <span key={w} className="leading-none">
                  {lbl?.label ?? ""}
                </span>
              );
            })}
          </div>

          {/* Grille jours */}
          <div className="flex gap-[2px]">
            {/* Labels jours de semaine (lundi en haut) */}
            <div className="flex flex-col gap-[2px] mr-1 text-[9px] text-muted">
              {DAY_LABELS.map((d, i) => (
                <span
                  key={i}
                  className="h-3 leading-3 flex items-center"
                  style={{ visibility: i % 2 === 0 ? "visible" : "hidden" }}
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Cellules : grid 7 rows × N cols, auto-flow column */}
            <div
              className="grid gap-[2px]"
              style={{
                gridTemplateRows: "repeat(7, 12px)",
                gridAutoFlow: "column",
                gridAutoColumns: "12px",
              }}
            >
              {cells.map((c) => {
                if (!c.inRange) {
                  return <div key={c.key} className="w-3 h-3" />;
                }
                return (
                  <div
                    key={c.key}
                    className={`w-3 h-3 rounded-sm ${intensityClass(c.count)} hover:ring-2 hover:ring-accent transition-all cursor-default`}
                    title={`${c.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · ${c.count} série${c.count > 1 ? "s" : ""}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-muted">
        <span>Moins</span>
        <div className="w-3 h-3 rounded-sm bg-surface2 border border-border/50" />
        <div className="w-3 h-3 rounded-sm bg-success/30" />
        <div className="w-3 h-3 rounded-sm bg-success/60" />
        <div className="w-3 h-3 rounded-sm bg-success/85" />
        <div className="w-3 h-3 rounded-sm bg-success" />
        <span>Plus</span>
      </div>
    </Card>
  );
}
