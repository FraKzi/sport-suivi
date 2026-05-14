import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardTitle, Badge } from "@/components/ui";
import Link from "next/link";
import { MUSCLE_LABEL_FR, musclesFromExercise } from "@/lib/muscleGroups";
import { SPLIT_LABEL } from "@/lib/programGenerator";

export const dynamic = "force-dynamic";

export default async function SeancesPage() {
  const user = await requireUser();
  const program = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    include: {
      exercises: {
        where: { archived: false },
        orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
      },
    },
  });
  if (!program) redirect("/onboarding");

  const daysLabels = JSON.parse(program.daysLabels) as string[];
  const byDay = program.exercises.reduce<Record<number, typeof program.exercises>>(
    (acc, e) => {
      (acc[e.dayNumber] ??= []).push(e);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Séances</h1>
        <p className="text-sm text-muted mt-1">
          {SPLIT_LABEL[program.split]} — choisis une séance pour la démarrer.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: program.daysPerWeek }, (_, i) => i + 1).map((d) => {
          const dayExos = byDay[d] ?? [];
          // muscles principaux de la journée pour le sous-titre
          const muscles = new Set<string>();
          for (const e of dayExos) {
            for (const m of musclesFromExercise(e.primaryMuscle, e.secondaryMuscles)) {
              muscles.add(MUSCLE_LABEL_FR[m]);
            }
          }
          return (
            <Card key={d}>
              <div className="flex items-baseline justify-between mb-1">
                <CardTitle>{daysLabels[d - 1] ?? `Jour ${d}`}</CardTitle>
                <Link
                  href={`/seances/${d}`}
                  className="text-xs bg-accent hover:bg-accent/90 text-white px-3 py-1 rounded-md"
                >
                  Démarrer →
                </Link>
              </div>
              <p className="text-xs text-muted mb-3">
                {[...muscles].slice(0, 6).join(" · ")}
              </p>
              <ul className="space-y-2">
                {dayExos.map((e) => (
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
          );
        })}
      </div>

      <Card>
        <CardTitle>Surcharge progressive — quand & comment</CardTitle>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-text mb-1">📈 QUAND monter la charge</div>
            <ul className="text-muted space-y-1 list-disc list-inside">
              <li>
                Tu boucles <strong>toutes les séries</strong> au{" "}
                <strong>haut de la fourchette</strong> de reps prescrite (ex : 4×8-12 → tu fais 12,
                12, 12, 12).
              </li>
              <li>La dernière rep reste avec ~2 reps en réserve (RPE ≤ 8).</li>
              <li>La technique reste propre (pas de triche, tempo respecté).</li>
            </ul>
            <p className="text-xs text-muted mt-2 italic">
              Si tu rates une condition → tu gardes la charge la séance suivante et tu ajoutes 1
              rep.
            </p>
          </div>

          <div>
            <div className="font-medium text-text mb-1">⚙️ COMMENT incrémenter</div>
            <ul className="text-muted space-y-1 list-disc list-inside">
              <li>
                <strong>Polyarticulaires lourds</strong> (Squat, Bench, RDL, Pendlay) :{" "}
                <strong>+2.5&nbsp;kg</strong> total (1.25 par côté).
              </li>
              <li>
                <strong>Isolations</strong> (curls, lateral raise, tricep ext, fly) :{" "}
                <strong>+1&nbsp;à&nbsp;2&nbsp;kg</strong>, ou +1 rep si pas de plus petit incrément.
              </li>
              <li>
                Après augmentation, tu retombes en <strong>bas de la fourchette</strong> de reps. Tu
                remontes séance après séance.
              </li>
              <li>
                Stagnation 2 séances de suite → <strong>deload -10%</strong> charge sur l&apos;exo,
                puis tu remontes.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="font-medium text-text mb-1 text-sm">🗓 Cadence & repos</div>
          <ul className="text-sm text-muted space-y-1 list-disc list-inside">
            <li>
              Repos entre séries : <strong>2-3 min</strong> sur les polyarticulaires,{" "}
              <strong>60-90 sec</strong> sur les isolations.
            </li>
            <li>
              Tempo : <strong>2-3 sec en négatif</strong>, contraction explosive en positif.
            </li>
            <li>Note systématiquement la RPE pour identifier quand tu peux réellement charger plus.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
