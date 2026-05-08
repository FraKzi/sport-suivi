import { prisma } from "@/lib/prisma";
import { Card, CardTitle, Badge } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DAY_LABELS: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Jour 1 — Upper", subtitle: "Pecs · Dos · Épaules · Biceps · Triceps" },
  2: { title: "Jour 2 — Lower", subtitle: "Quadriceps · Ischios · Fessiers · Mollets" },
  3: { title: "Jour 3 — Full Body", subtitle: "Toute la chaîne · Pecs haut · Dos · Triceps" },
};

export default async function SeancesPage() {
  const exos = await prisma.exercise.findMany({
    orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
  });

  const byDay = exos.reduce<Record<number, typeof exos>>((acc, e) => {
    (acc[e.dayNumber] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Séances</h1>
        <p className="text-sm text-muted mt-1">
          Choisis une séance pour la démarrer et enregistrer tes performances.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((d) => (
          <Card key={d}>
            <div className="flex items-baseline justify-between mb-1">
              <CardTitle>{DAY_LABELS[d].title}</CardTitle>
              <Link
                href={`/seances/${d}`}
                className="text-xs bg-accent hover:bg-accent/90 text-white px-3 py-1 rounded-md"
              >
                Démarrer →
              </Link>
            </div>
            <p className="text-xs text-muted mb-3">{DAY_LABELS[d].subtitle}</p>
            <ul className="space-y-2">
              {(byDay[d] ?? []).map((e) => (
                <li key={e.id} className="text-sm flex items-start justify-between gap-2">
                  <span>
                    <span className="text-muted mr-1">{e.orderIndex}.</span>
                    {e.name}
                  </span>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge tone={e.type === "POLY" ? "accent" : "default"}>{e.type}</Badge>
                    <span className="text-[11px] text-muted">{e.prescription}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Principes clés</CardTitle>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li>Surcharge progressive : monter le poids dès que toutes les séries sont bouclées en haut de la fourchette.</li>
          <li>Tempo : 2-3 sec négatif, explosif positif.</li>
          <li>Repos : 2-3 min sur poly, 60-90 sec sur iso.</li>
          <li>Fréquence : J1 / J2 / repos / J3 — ou J1 / repos / J2 / repos / J3.</li>
        </ul>
      </Card>
    </div>
  );
}
