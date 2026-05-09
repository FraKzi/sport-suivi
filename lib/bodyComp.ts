/**
 * Calcul du % masse grasse via la formule US Navy (circumference method).
 * Précision typique ±3% vs DEXA — bon compromis sans matériel.
 *
 * Hommes : 86.010 × log10(taille - cou) - 70.041 × log10(taille) + 36.76
 * Femmes : 163.205 × log10(taille + hanches - cou) - 97.684 × log10(taille) - 78.387
 *
 * Toutes les mesures sont en cm.
 */

type Sex = "MALE" | "FEMALE";

export function navyBodyFat(args: {
  sex: Sex;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm?: number;
}): number | null {
  const { sex, heightCm, waistCm, neckCm, hipCm } = args;
  if (heightCm <= 0 || waistCm <= 0 || neckCm <= 0) return null;
  if (waistCm <= neckCm) return null; // formule diverge

  if (sex === "MALE") {
    const v =
      86.010 * Math.log10(waistCm - neckCm) -
      70.041 * Math.log10(heightCm) +
      36.76;
    if (!Number.isFinite(v) || v <= 0 || v > 60) return null;
    return Math.round(v * 10) / 10;
  }
  // FEMALE
  if (!hipCm || hipCm <= 0) return null;
  if (waistCm + hipCm <= neckCm) return null;
  const v =
    163.205 * Math.log10(waistCm + hipCm - neckCm) -
    97.684 * Math.log10(heightCm) -
    78.387;
  if (!Number.isFinite(v) || v <= 0 || v > 60) return null;
  return Math.round(v * 10) / 10;
}

/** Classification standard du %MG (American Council on Exercise). */
export function classifyBodyFat(pct: number, sex: Sex): string {
  if (sex === "MALE") {
    if (pct < 6) return "Essentiel (athlète)";
    if (pct < 14) return "Athlétique";
    if (pct < 18) return "Fitness";
    if (pct < 25) return "Acceptable";
    return "Obésité";
  }
  if (pct < 14) return "Essentiel (athlète)";
  if (pct < 21) return "Athlétique";
  if (pct < 25) return "Fitness";
  if (pct < 32) return "Acceptable";
  return "Obésité";
}
