"use client";
import { Card, CardTitle } from "@/components/ui";

type Counts = {
  workouts: number;
  weights: number;
  measurements: number;
  daily: number;
  meals: number;
};

const ITEMS: { type: keyof Counts; label: string; description: string }[] = [
  {
    type: "workouts",
    label: "Séances & séries",
    description: "Toutes les séries (poids, reps, RPE, exo, date) depuis le début.",
  },
  {
    type: "weights",
    label: "Suivi du poids",
    description: "Pesées corporelles avec dates et notes.",
  },
  {
    type: "measurements",
    label: "Mesures corporelles",
    description: "Tour de taille, hanches, cou, bras, %MG…",
  },
  {
    type: "daily",
    label: "Journal quotidien",
    description: "Pas, hydratation et notes par jour.",
  },
  {
    type: "meals",
    label: "Repas pris",
    description: "Toggles 'mangé' avec variante de plan choisie par jour.",
  },
];

export function ExportData({ counts }: { counts: Counts }) {
  return (
    <Card>
      <CardTitle>Export des données</CardTitle>
      <p className="text-xs text-muted mb-3">
        Télécharge tes données au format CSV (compatible Excel, Google Sheets, Numbers).
        Les fichiers sont encodés UTF-8 avec BOM pour Excel Windows.
      </p>
      <ul className="divide-y divide-border">
        {ITEMS.map((item) => {
          const count = counts[item.type];
          const isEmpty = count === 0;
          return (
            <li
              key={item.type}
              className="py-2.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight flex items-baseline gap-2">
                  {item.label}
                  <span className="text-xs text-muted tabular-nums">
                    {count.toLocaleString("fr-FR")} ligne{count > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-xs text-muted mt-0.5">{item.description}</div>
              </div>
              {isEmpty ? (
                <span className="text-xs text-muted px-3 py-1.5">vide</span>
              ) : (
                <a
                  href={`/api/export/${item.type}`}
                  download
                  className="text-xs px-3 py-1.5 rounded-md bg-surface2 hover:bg-accent hover:text-white border border-border transition-colors whitespace-nowrap"
                >
                  ⬇ CSV
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
