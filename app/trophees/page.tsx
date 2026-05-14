import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardTitle, Stat } from "@/components/ui";
import {
  computeAchievements,
  CATEGORY_LABEL,
  type Achievement,
  type AchievementCategory,
} from "@/lib/achievements";
import { DEFAULT_STEPS_TARGET, WATER_ML_PER_KG } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function TropheesPage() {
  const user = await requireUser();
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    include: { sets: { include: { exercise: { select: { name: true } } } } },
  });
  const dailyLogs = await prisma.dailyLog.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });

  const waterTargetMl = profile
    ? Math.round(profile.currentWeight * WATER_ML_PER_KG)
    : 2500;

  const achievements = computeAchievements({
    sessions: sessions.map((s) => ({
      date: s.date.toISOString(),
      sets: s.sets.map((set) => ({
        weightKg: set.weightKg,
        reps: set.reps,
        exerciseName: set.exercise?.name ?? "",
      })),
    })),
    dailyLogs: dailyLogs.map((l) => ({
      date: l.date.toISOString(),
      steps: l.steps,
      waterMl: l.waterMl,
    })),
    profile: profile
      ? { bodyWeightKg: profile.currentWeight, sex: profile.sex }
      : null,
    waterTargetMl,
    stepsTarget: DEFAULT_STEPS_TARGET,
  });

  // Regroupe par catégorie
  const byCategory: Record<AchievementCategory, Achievement[]> = {
    milestone: [],
    streak: [],
    strength: [],
    volume: [],
    habit: [],
  };
  for (const a of achievements) byCategory[a.category].push(a);

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">🎖 Trophées</h1>
        <p className="text-sm text-muted mt-1">
          Achievements débloqués automatiquement à partir de tes données.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Débloqués" value={`${unlocked}`} hint={`/${total}`} />
        <Stat label="Complétion" value={`${pct}`} unit="%" />
        <Stat
          label="Restants"
          value={`${total - unlocked}`}
          hint="à débloquer"
        />
      </div>

      {/* Barre de progression globale */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-baseline justify-between text-sm mb-2">
          <span className="text-muted">Progression globale</span>
          <span className="tabular-nums font-medium">
            {unlocked} / {total}
          </span>
        </div>
        <div className="h-3 bg-surface2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-success transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {(Object.keys(byCategory) as AchievementCategory[]).map((cat) => {
        const items = byCategory[cat];
        if (items.length === 0) return null;
        const unlockedInCat = items.filter((a) => a.unlocked).length;
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">{CATEGORY_LABEL[cat]}</h2>
              <span className="text-xs text-muted">
                {unlockedInCat} / {items.length}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted">
        💡 Astuce : les achievements de force basés sur le poids de corps apparaissent
        uniquement quand ton profil contient un poids actuel.
      </p>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { unlocked, progress } = achievement;
  const ratio = progress.target > 0 ? progress.current / progress.target : 0;
  const pct = Math.min(100, Math.round(ratio * 100));

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all ${
        unlocked
          ? "bg-gradient-to-br from-accent/10 to-success/10 border-accent/40"
          : "bg-surface2 border-border opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`text-3xl shrink-0 transition-all ${
            unlocked ? "" : "grayscale opacity-50"
          }`}
          aria-hidden
        >
          {achievement.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-sm font-semibold leading-tight ${unlocked ? "" : "text-muted"}`}>
              {achievement.name}
            </span>
            {unlocked && (
              <span className="text-xs text-success font-medium">✓</span>
            )}
          </div>
          <p className="text-[11px] text-muted mt-1 leading-snug">
            {achievement.description}
          </p>
          {!unlocked && progress.target > 0 && (
            <>
              <div className="h-1 bg-surface rounded-full overflow-hidden mt-2.5">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] text-muted mt-1 tabular-nums">
                {Math.round(progress.current)} / {progress.target}{" "}
                {progress.unit ?? ""}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
