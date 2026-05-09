import { prisma } from "@/lib/prisma";
import { Card, CardTitle, Badge } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DAY_LABELS: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Pull", subtitle: "Dos · Biceps · Épaules postérieures" },
  2: { title: "Legs", subtitle: "Quadriceps · Ischios · Fessiers" },
  3: { title: "Push", subtitle: "Pecs · Épaules · Triceps" },
};

export default async function SeancesPage() {
  const exos = await prisma.exercise.findMany({
    where: { archived: false },
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
        <CardTitle>Surcharge progressive — quand & comment</CardTitle>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-text mb-1">📈 QUAND monter la charge</div>
            <ul className="text-muted space-y-1 list-disc list-inside">
              <li>Tu boucles <strong>toutes les séries</strong> au <strong>haut de la fourchette</strong> de reps prescrite (ex : 4×8-12 → tu fais 12, 12, 12, 12).</li>
              <li>La dernière rep reste avec ~2 reps en réserve (RPE ≤ 8).</li>
              <li>La technique reste propre (pas de triche, tempo respecté).</li>
            </ul>
            <p className="text-xs text-muted mt-2 italic">
              Si tu rates une condition → tu gardes la charge la séance suivante et tu ajoutes 1 rep.
            </p>
          </div>

          <div>
            <div className="font-medium text-text mb-1">⚙️ COMMENT incrémenter</div>
            <ul className="text-muted space-y-1 list-disc list-inside">
              <li><strong>Polyarticulaires lourds</strong> (Squat, Bench, RDL, Pendlay) : <strong>+2.5&nbsp;kg</strong> total (1.25 par côté).</li>
              <li><strong>Isolations</strong> (curls, lateral raise, tricep ext, fly) : <strong>+1&nbsp;à&nbsp;2&nbsp;kg</strong>, ou +1 rep si pas de plus petit incrément.</li>
              <li>Après augmentation, tu retombes en <strong>bas de la fourchette</strong> de reps. Tu remontes séance après séance.</li>
              <li>Stagnation 2 séances de suite → <strong>deload -10%</strong> charge sur l'exo, puis tu remontes.</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="font-medium text-text mb-1 text-sm">🗓 Cadence & repos</div>
          <ul className="text-sm text-muted space-y-1 list-disc list-inside">
            <li>Rotation Pull → Legs → Push, avec 1 jour de repos entre deux jours lourds (ex : Pu / Le / repos / Pu / Push / Le / repos).</li>
            <li>Repos entre séries : <strong>2-3 min</strong> sur les polyarticulaires, <strong>60-90 sec</strong> sur les isolations.</li>
            <li>Tempo : <strong>2-3 sec en négatif</strong>, contraction explosive en positif.</li>
            <li>Note systématiquement la RPE pour identifier quand tu peux réellement charger plus.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
