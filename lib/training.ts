/**
 * Logique d'entraînement : timer de repos + suggestion de charge.
 */

import type { ExerciseType } from "@prisma/client";

// ---------- TIMER DE REPOS ----------

export const REST_SECONDS_BY_TYPE: Record<ExerciseType, number> = {
  POLY: 180, // 3 min sur les polyarticulaires lourds
  ISO: 90, // 1 min 30 sur les isolations
};

export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// ---------- SUGGESTION DE CHARGE ----------

export type LoadSuggestion = {
  kg: number; // charge à essayer
  delta: number; // delta vs dernière session (peut être négatif)
  label: string; // texte affiché
  tone: "up" | "hold" | "deload" | "first";
  reason: string; // explication courte
};

type SetLite = {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
};

/**
 * Suggère une charge pour la prochaine séance d'un exercice donné, à partir
 * de la dernière session. Règles simples (rule-based, pas de ML) :
 *  - Top reps atteint au plafond + RPE moyen ≤ 7 → +increment (up)
 *  - RPE moyen ≥ 9 → −10% (deload)
 *  - Sinon → garde la charge
 *  - Aucune donnée précédente → null (premier coup)
 */
export function computeLoadSuggestion(
  lastSets: SetLite[],
  prescription: string,
  type: ExerciseType,
): LoadSuggestion | null {
  const valid = lastSets.filter(
    (s) => s.weightKg != null && s.reps != null && s.weightKg > 0,
  );
  if (valid.length === 0) return null;

  // Charge utilisée : on prend le top set (poids max chargé)
  const baseKg = Math.max(...valid.map((s) => s.weightKg!));

  // Reps atteintes sur le top set
  const topReps = Math.max(
    ...valid.filter((s) => s.weightKg === baseKg).map((s) => s.reps!),
  );

  // RPE moyen (sets renseignés uniquement)
  const rpes = valid
    .map((s) => s.rpe)
    .filter((r): r is number => r != null && r > 0);
  const avgRpe = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

  // Plage de reps prescrite : "4×8-12" → 12 (max), "3×6-8" → 8
  const m = prescription.match(/(\d+)\s*-\s*(\d+)/);
  const repMax = m ? parseInt(m[2], 10) : null;
  const repMin = m ? parseInt(m[1], 10) : null;

  const increment = type === "POLY" ? 2.5 : 1;

  // Up : top reps atteint et RPE confortable
  const reachedTop = repMax != null && topReps >= repMax;
  const lowRpe = avgRpe == null || avgRpe <= 7.5;
  if (reachedTop && lowRpe) {
    const next = baseKg + increment;
    return {
      kg: next,
      delta: increment,
      label: `+${increment} kg`,
      tone: "up",
      reason: `Tu as bouclé ${topReps} reps${avgRpe != null ? ` à RPE ${avgRpe.toFixed(1)}` : ""} la dernière fois — tu peux monter.`,
    };
  }

  // Deload : RPE trop haut (technique compromise)
  if (avgRpe != null && avgRpe >= 9) {
    const next = Math.round(baseKg * 0.9 * 2) / 2; // arrondi 0.5 kg
    return {
      kg: next,
      delta: next - baseKg,
      label: `−10% (deload)`,
      tone: "deload",
      reason: `RPE moyen ${avgRpe.toFixed(1)} la dernière fois — réduis la charge pour préserver la technique.`,
    };
  }

  // Sous le plancher : garde la charge mais pousse les reps
  if (repMin != null && topReps < repMin) {
    return {
      kg: baseKg,
      delta: 0,
      label: `Même charge`,
      tone: "hold",
      reason: `Tu n'as pas atteint le plancher de reps (${repMin}) — reste à ${baseKg} kg et essaie de monter en reps.`,
    };
  }

  // Hold : continue à monter les reps avant d'augmenter la charge
  return {
    kg: baseKg,
    delta: 0,
    label: `Même charge`,
    tone: "hold",
    reason:
      avgRpe != null
        ? `RPE ${avgRpe.toFixed(1)} la dernière fois — pousse 1 rep de plus avant d'augmenter.`
        : `Reste à ${baseKg} kg, vise le haut de la fourchette.`,
  };
}
