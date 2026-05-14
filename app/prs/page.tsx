import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardTitle, Badge, Stat } from "@/components/ui";
import { allTimeBests, type RawSet, type AllTimeBests } from "@/lib/progression";

export const dynamic = "force-dynamic";

const RECENT_DAYS = 7;

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < RECENT_DAYS * 86400_000;
}

export default async function PRsPage() {
  const user = await requireUser();

  const program = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    select: { daysLabels: true },
  });
  const daysLabels = program ? (JSON.parse(program.daysLabels) as string[]) : [];

  const exos = await prisma.userExercise.findMany({
    where: { program: { userId: user.id, active: true } },
    orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
  });

  const sets = await prisma.workoutSet.findMany({
    where: {
      session: { userId: user.id },
      weightKg: { not: null },
      reps: { not: null },
    },
    include: { session: { select: { date: true } } },
  });

  // Regroupe les sets par userExerciseId
  const setsByExo = new Map<number, RawSet[]>();
  for (const s of sets) {
    if (s.userExerciseId == null) continue;
    if (!setsByExo.has(s.userExerciseId)) setsByExo.set(s.userExerciseId, []);
    setsByExo.get(s.userExerciseId)!.push({
      weightKg: s.weightKg!,
      reps: s.reps!,
      rpe: s.rpe,
      date: s.session.date.toISOString(),
      setNumber: s.setNumber,
    });
  }

  type ExoRecord = {
    exo: (typeof exos)[number];
    bests: AllTimeBests;
    hasRecent: boolean;
  };

  const records: ExoRecord[] = exos
    .map((exo): ExoRecord | null => {
      const exoSets = setsByExo.get(exo.id) ?? [];
      if (exoSets.length === 0) return null;
      const bests = allTimeBests(exoSets);
      const hasRecent =
        (bests.topWeight && isRecent(bests.topWeight.date)) ||
        (bests.topE1RM && isRecent(bests.topE1RM.date)) ||
        (bests.topVolume && isRecent(bests.topVolume.date)) ||
        false;
      return { exo, bests, hasRecent: !!hasRecent };
    })
    .filter((r): r is ExoRecord => r !== null);

  const maxDay = Math.max(0, ...records.map((r) => r.exo.dayNumber));
  const byDay: ExoRecord[][] = Array.from({ length: maxDay }, () => []);
  for (const r of records) {
    if (r.exo.dayNumber >= 1 && r.exo.dayNumber <= maxDay) {
      byDay[r.exo.dayNumber - 1].push(r);
    }
  }

  const totalExos = records.length;
  const recentCount = records.filter((r) => r.hasRecent).length;
  // Global "lifetime tonnage" pour le côté trophée
  const totalTonnage = sets.reduce(
    (sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0),
    0,
  );

  if (totalExos === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">🏆 Mes records personnels</h1>
        <Card>
          <p className="text-sm text-muted">
            Aucun PR enregistré pour l'instant.{" "}
            <Link href="/seances" className="text-accent hover:underline">
              Démarre une séance
            </Link>{" "}
            et chaque charge × reps soulevée deviendra un nouveau record.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">🏆 Mes records personnels</h1>
        <p className="text-sm text-muted mt-1">
          Top performance pour chaque exercice. Cliquer pour voir la progression complète.
        </p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Exercices avec PR" value={totalExos} />
        <Stat
          label="PR récents"
          value={recentCount}
          hint={`derniers ${RECENT_DAYS} jours`}
        />
        <Stat
          label="Tonnage total"
          value={Math.round(totalTonnage).toLocaleString("fr-FR")}
          unit="kg"
          hint="depuis le début"
        />
      </div>

      {/* Records par jour de programme */}
      {byDay.map((dayRecords, idx) => {
        if (dayRecords.length === 0) return null;
        const day = idx + 1;
        return (
          <div key={day} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-semibold">
                Jour {day} · {daysLabels[day - 1] ?? ""}
              </h2>
              <span className="text-xs text-muted">
                {dayRecords.length} exercice{dayRecords.length > 1 ? "s" : ""}
              </span>
            </div>
            <ul className="space-y-2">
              {dayRecords.map(({ exo, bests, hasRecent }) => (
                <li key={exo.id}>
                  <Link
                    href={`/exercices/${exo.id}`}
                    className="block bg-surface border border-border rounded-xl p-4 hover:border-accent/50 transition-colors group"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="font-semibold text-sm leading-tight">
                          {exo.name}
                        </span>
                        <Badge tone={exo.type === "POLY" ? "accent" : "default"}>
                          {exo.type}
                        </Badge>
                        {hasRecent && <Badge tone="warning">🔥 Récent</Badge>}
                        {exo.archived && (
                          <span className="text-[11px] text-muted italic">archivé</span>
                        )}
                      </div>
                      <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        Voir progression →
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {/* Charge max */}
                      <div className="bg-surface2 rounded-lg p-2.5">
                        <div className="text-[10px] text-muted uppercase tracking-wide">
                          ⚖ Charge max
                        </div>
                        {bests.topWeight ? (
                          <>
                            <div className="text-lg font-semibold tabular-nums leading-tight mt-0.5">
                              {bests.topWeight.value.toFixed(1)}{" "}
                              <span className="text-xs text-muted font-normal">kg</span>
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                              × {bests.topWeight.reps} · {timeAgo(bests.topWeight.date)}
                              {isRecent(bests.topWeight.date) && (
                                <span className="text-warning ml-1">⭐</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-muted text-xs mt-1">–</div>
                        )}
                      </div>

                      {/* e1RM */}
                      <div className="bg-surface2 rounded-lg p-2.5">
                        <div className="text-[10px] text-muted uppercase tracking-wide">
                          ⚡ e1RM
                        </div>
                        {bests.topE1RM ? (
                          <>
                            <div className="text-lg font-semibold tabular-nums leading-tight mt-0.5">
                              {Math.round(bests.topE1RM.value)}{" "}
                              <span className="text-xs text-muted font-normal">kg</span>
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                              {bests.topE1RM.weight}×{bests.topE1RM.reps} ·{" "}
                              {timeAgo(bests.topE1RM.date)}
                              {isRecent(bests.topE1RM.date) && (
                                <span className="text-warning ml-1">⭐</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-muted text-xs mt-1">–</div>
                        )}
                      </div>

                      {/* Volume */}
                      <div className="bg-surface2 rounded-lg p-2.5">
                        <div className="text-[10px] text-muted uppercase tracking-wide">
                          📊 Top vol
                        </div>
                        {bests.topVolume ? (
                          <>
                            <div className="text-lg font-semibold tabular-nums leading-tight mt-0.5">
                              {Math.round(bests.topVolume.value)}{" "}
                              <span className="text-xs text-muted font-normal">kg</span>
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                              {bests.topVolume.weight}×{bests.topVolume.reps} ·{" "}
                              {timeAgo(bests.topVolume.date)}
                              {isRecent(bests.topVolume.date) && (
                                <span className="text-warning ml-1">⭐</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-muted text-xs mt-1">–</div>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="text-xs text-muted">
        ⚖ Charge max = poids le plus lourd soulevé (toutes reps confondues).{" "}
        ⚡ e1RM = 1RM estimé via Epley (`w × (1 + r/30)`), indicateur de force absolue.{" "}
        📊 Top volume = meilleur set en charge × reps.
      </p>
    </div>
  );
}
