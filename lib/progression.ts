/**
 * Calculs de progression pour un exercice donné.
 */

/** Estimation 1RM via la formule Epley (weight × (1 + reps/30)). */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export type RawSet = {
  weightKg: number;
  reps: number;
  rpe: number | null;
  date: string; // ISO
  setNumber: number;
};

export type SessionPerf = {
  date: string; // YYYY-MM-DD
  isoDate: string;
  topWeight: number;
  topWeightReps: number; // reps au top weight
  topE1RM: number;
  totalVolume: number;
  setsCount: number;
};

function ymd(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function progressionPerSession(sets: RawSet[]): SessionPerf[] {
  const byDate = new Map<string, RawSet[]>();
  for (const s of sets) {
    const key = ymd(s.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(s);
  }

  const result: SessionPerf[] = [];
  for (const [date, ss] of byDate) {
    let topWeight = 0;
    let topWeightReps = 0;
    let topE1RM = 0;
    let totalVolume = 0;
    for (const s of ss) {
      const vol = s.weightKg * s.reps;
      const e1 = epley1RM(s.weightKg, s.reps);
      totalVolume += vol;
      if (s.weightKg > topWeight) {
        topWeight = s.weightKg;
        topWeightReps = s.reps;
      } else if (s.weightKg === topWeight && s.reps > topWeightReps) {
        topWeightReps = s.reps;
      }
      if (e1 > topE1RM) topE1RM = e1;
    }
    result.push({
      date,
      isoDate: ss[0].date,
      topWeight,
      topWeightReps,
      topE1RM,
      totalVolume,
      setsCount: ss.length,
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export type AllTimeBests = {
  topWeight: { value: number; reps: number; date: string } | null;
  topE1RM: { value: number; weight: number; reps: number; date: string } | null;
  topVolume: { value: number; weight: number; reps: number; date: string } | null;
};

/** Records absolus (par série, pas par session). */
export function allTimeBests(sets: RawSet[]): AllTimeBests {
  let topWeight: AllTimeBests["topWeight"] = null;
  let topE1RM: AllTimeBests["topE1RM"] = null;
  let topVolume: AllTimeBests["topVolume"] = null;

  for (const s of sets) {
    const e1 = epley1RM(s.weightKg, s.reps);
    const vol = s.weightKg * s.reps;
    if (!topWeight || s.weightKg > topWeight.value) {
      topWeight = { value: s.weightKg, reps: s.reps, date: s.date };
    }
    if (!topE1RM || e1 > topE1RM.value) {
      topE1RM = { value: e1, weight: s.weightKg, reps: s.reps, date: s.date };
    }
    if (!topVolume || vol > topVolume.value) {
      topVolume = { value: vol, weight: s.weightKg, reps: s.reps, date: s.date };
    }
  }
  return { topWeight, topE1RM, topVolume };
}

/** Tonnage cumulé sur une fenêtre (en jours) à partir d'aujourd'hui. */
export function tonnageWindow(sets: RawSet[], days: number): number {
  const cutoff = Date.now() - days * 86400_000;
  let sum = 0;
  for (const s of sets) {
    if (new Date(s.date).getTime() >= cutoff) {
      sum += s.weightKg * s.reps;
    }
  }
  return sum;
}

/** Différence entre la dernière performance et celle d'il y a ~30 jours (e1RM). */
export function progressVs30Days(sessions: SessionPerf[]): number | null {
  if (sessions.length < 2) return null;
  const latest = sessions[sessions.length - 1];
  const cutoff = Date.now() - 30 * 86400_000;
  // Trouve la session la plus récente AVANT le cutoff
  const before = [...sessions]
    .reverse()
    .find((s) => new Date(s.isoDate).getTime() <= cutoff);
  if (!before) return null;
  return latest.topE1RM - before.topE1RM;
}

// ============== DÉTECTION DE PLATEAU ==============

export type PlateauDetection = {
  weeksWindow: number;
  recentMaxE1RM: number;
  earlierMaxE1RM: number;
  delta: number;
  pctDelta: number;
  isPlateau: boolean;
  recentSessionsCount: number;
};

/**
 * Compare le top e1RM de la fenêtre récente (N semaines) à celui de la fenêtre
 * d'avant (N→2N semaines). Plateau si delta < 2 kg ET delta < 2%.
 *
 * Retourne null si pas assez de données pour comparer (besoin de 2 fenêtres
 * non vides).
 */
export function detectPlateau(
  sessions: SessionPerf[],
  weeksWindow = 4,
): PlateauDetection | null {
  if (sessions.length < 3) return null;

  const recentCutoff = Date.now() - weeksWindow * 7 * 86400_000;
  const earlierCutoff = Date.now() - weeksWindow * 2 * 7 * 86400_000;

  const recent = sessions.filter(
    (s) => new Date(s.isoDate).getTime() >= recentCutoff,
  );
  const earlier = sessions.filter((s) => {
    const t = new Date(s.isoDate).getTime();
    return t >= earlierCutoff && t < recentCutoff;
  });

  if (recent.length === 0 || earlier.length === 0) return null;

  const recentMax = Math.max(...recent.map((s) => s.topE1RM));
  const earlierMax = Math.max(...earlier.map((s) => s.topE1RM));
  const delta = recentMax - earlierMax;
  const pctDelta = earlierMax > 0 ? (delta / earlierMax) * 100 : 0;

  const isPlateau = delta < 2 && pctDelta < 2;

  return {
    weeksWindow,
    recentMaxE1RM: recentMax,
    earlierMaxE1RM: earlierMax,
    delta,
    pctDelta,
    isPlateau,
    recentSessionsCount: recent.length,
  };
}
