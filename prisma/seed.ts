import { PrismaClient, MealSlot } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- Exercices (extraits du programme) ----------
const exercises: {
  name: string;
  type: "POLY" | "ISO";
  dayNumber: number;
  orderIndex: number;
  prescription: string;
  description?: string;
  muscleGroups?: string;
}[] = [
  // JOUR 1 — Upper
  { name: "Développé couché barre", type: "POLY", dayNumber: 1, orderIndex: 1, prescription: "4×5-8", description: "Base de masse pectorale, charge maximale", muscleGroups: "Pecs · Triceps" },
  { name: "Tractions pronation lestées", type: "POLY", dayNumber: 1, orderIndex: 2, prescription: "4×5-8", description: "Meilleur exo dos en amplitude complète", muscleGroups: "Dos · Biceps" },
  { name: "Développé militaire haltères", type: "POLY", dayNumber: 1, orderIndex: 3, prescription: "3×8-10", description: "Masse épaules + stabilisation", muscleGroups: "Épaules · Triceps" },
  { name: "Rowing barre", type: "POLY", dayNumber: 1, orderIndex: 4, prescription: "3×8-10", description: "Épaisseur du dos, recrutement total", muscleGroups: "Dos" },
  { name: "Élévations latérales câble", type: "ISO", dayNumber: 1, orderIndex: 5, prescription: "4×15-20", description: "Cible le deltoïde latéral, incontournable", muscleGroups: "Épaules" },
  { name: "Curl haltères incliné", type: "ISO", dayNumber: 1, orderIndex: 6, prescription: "3×10-12", description: "Étirement maximal du biceps", muscleGroups: "Biceps" },

  // JOUR 2 — Lower
  { name: "Squat barre", type: "POLY", dayNumber: 2, orderIndex: 1, prescription: "4×6-10", description: "Roi des quadriceps, pic anabolisant", muscleGroups: "Quadriceps · Fessiers" },
  { name: "Romanian Deadlift", type: "POLY", dayNumber: 2, orderIndex: 2, prescription: "4×8-10", description: "Étirement + tension ischio = stimulus optimal", muscleGroups: "Ischios · Fessiers" },
  { name: "Fentes bulgares haltères", type: "POLY", dayNumber: 2, orderIndex: 3, prescription: "3×8-10 / jambe", description: "Unilatéral = correction déséquilibres", muscleGroups: "Quadriceps · Fessiers" },
  { name: "Hip Thrust barre", type: "POLY", dayNumber: 2, orderIndex: 4, prescription: "3×10-12", description: "Meilleur recrutement fessier possible", muscleGroups: "Fessiers" },
  { name: "Leg curl couché", type: "ISO", dayNumber: 2, orderIndex: 5, prescription: "3×12-15", description: "Isole les ischios en étirement long", muscleGroups: "Ischios" },
  { name: "Mollets debout", type: "ISO", dayNumber: 2, orderIndex: 6, prescription: "4×15-20", description: "Amplitude complète, indispensable", muscleGroups: "Mollets" },

  // JOUR 3 — Full Body
  { name: "Soulevé de terre conventionnel", type: "POLY", dayNumber: 3, orderIndex: 1, prescription: "4×4-6", description: "Toute la chaîne postérieure", muscleGroups: "Dos · Ischios · Fessiers" },
  { name: "Développé incliné haltères", type: "POLY", dayNumber: 3, orderIndex: 2, prescription: "3×8-12", description: "Haut des pecs, sous-sollicité par le plat", muscleGroups: "Pecs haut · Épaules" },
  { name: "Tractions supination lestées", type: "POLY", dayNumber: 3, orderIndex: 3, prescription: "3×6-10", description: "Biceps + dos sollicités simultanément", muscleGroups: "Dos · Biceps" },
  { name: "Dips lestés", type: "POLY", dayNumber: 3, orderIndex: 4, prescription: "3×8-10", description: "Bas des pecs + triceps lourds", muscleGroups: "Pecs · Triceps" },
  { name: "Face pull câble", type: "ISO", dayNumber: 3, orderIndex: 5, prescription: "3×15-20", description: "Deltoïde postérieur + santé épaule", muscleGroups: "Épaules post." },
  { name: "Écarté haltères / Pec deck", type: "ISO", dayNumber: 3, orderIndex: 6, prescription: "3×12-15", description: "Étirement pec en tension = hypertrophie", muscleGroups: "Pecs" },
  { name: "Gainage lesté", type: "POLY", dayNumber: 3, orderIndex: 7, prescription: "3 séries", description: "Sangle abdominale = socle de tous les exos", muscleGroups: "Abdos" },
];

// ---------- Catalogue d'aliments (macros par 100g, sauf piece) ----------
const foods: {
  name: string;
  unit: string;
  unitGrams?: number;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
}[] = [
  { name: "Flocons d'avoine",      unit: "g",     kcalPer100: 380, proteinPer100: 13,  carbsPer100: 60,  fatPer100: 7 },
  { name: "Lait demi-écrémé",      unit: "ml",    kcalPer100: 47,  proteinPer100: 3.3, carbsPer100: 4.7, fatPer100: 1.5 },
  { name: "Œuf entier",            unit: "piece", unitGrams: 55, kcalPer100: 155, proteinPer100: 13,  carbsPer100: 1.1, fatPer100: 11 },
  { name: "Blancs d'œufs",         unit: "g",     kcalPer100: 52,  proteinPer100: 11,  carbsPer100: 0.7, fatPer100: 0.2 },
  { name: "Banane",                unit: "piece", unitGrams: 120, kcalPer100: 89,  proteinPer100: 1.1, carbsPer100: 23,  fatPer100: 0.3 },
  { name: "Beurre de cacahuète",   unit: "g",     kcalPer100: 588, proteinPer100: 25,  carbsPer100: 20,  fatPer100: 50 },
  { name: "Blanc de poulet cuit",  unit: "g",     kcalPer100: 165, proteinPer100: 31,  carbsPer100: 0,   fatPer100: 3.6 },
  { name: "Riz cuit",              unit: "g",     kcalPer100: 130, proteinPer100: 2.7, carbsPer100: 28,  fatPer100: 0.3 },
  { name: "Huile d'olive",         unit: "g",     kcalPer100: 884, proteinPer100: 0,   carbsPer100: 0,   fatPer100: 100 },
  { name: "Légumes (mix)",         unit: "g",     kcalPer100: 35,  proteinPer100: 2,   carbsPer100: 5,   fatPer100: 0.5 },
  { name: "Skyr / Fromage blanc 0%", unit: "g",   kcalPer100: 60,  proteinPer100: 10,  carbsPer100: 4,   fatPer100: 0.2 },
  { name: "Pomme",                 unit: "piece", unitGrams: 180, kcalPer100: 52,  proteinPer100: 0.3, carbsPer100: 14,  fatPer100: 0.2 },
  { name: "Steak haché 5%",        unit: "g",     kcalPer100: 137, proteinPer100: 21,  carbsPer100: 0,   fatPer100: 5 },
  { name: "Pommes de terre cuites", unit: "g",    kcalPer100: 87,  proteinPer100: 1.9, carbsPer100: 20,  fatPer100: 0.1 },
  { name: "Pain complet",          unit: "piece", unitGrams: 30, kcalPer100: 247, proteinPer100: 9,   carbsPer100: 41,  fatPer100: 4 },
  // Nouveaux pour les variantes économiques
  { name: "Thon nature en boîte",  unit: "g",     kcalPer100: 116, proteinPer100: 26,  carbsPer100: 0,   fatPer100: 1 },
  { name: "Pâtes cuites",          unit: "g",     kcalPer100: 158, proteinPer100: 5.8, carbsPer100: 31,  fatPer100: 0.9 },
];

// ---------- Variantes de repas ----------
type MealVariant = {
  slot: MealSlot;
  variantKey: string;
  displayName: string;
  description?: string;
  items: { foodName: string; quantity: number }[];
};

const mealVariants: MealVariant[] = [
  // ===== PETIT-DÉJ =====
  {
    slot: "BREAKFAST",
    variantKey: "default",
    displayName: "Œufs & avoine",
    description: "Le petit-déj de référence. Riche en protéines, prend ~15 min.",
    items: [
      { foodName: "Flocons d'avoine", quantity: 100 },
      { foodName: "Lait demi-écrémé", quantity: 300 },
      { foodName: "Œuf entier", quantity: 3 },
      { foodName: "Blancs d'œufs", quantity: 200 },
      { foodName: "Banane", quantity: 1 },
      { foodName: "Beurre de cacahuète", quantity: 15 },
    ],
  },
  {
    slot: "BREAKFAST",
    variantKey: "skyr-avoine",
    displayName: "Bowl skyr & avoine",
    description: "Zéro œuf, zéro cuisson. 5 min chrono. Le moins cher.",
    items: [
      { foodName: "Flocons d'avoine", quantity: 70 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 300 },
      { foodName: "Lait demi-écrémé", quantity: 200 },
      { foodName: "Banane", quantity: 1 },
      { foodName: "Beurre de cacahuète", quantity: 25 },
    ],
  },
  {
    slot: "BREAKFAST",
    variantKey: "toast-oeuf",
    displayName: "Toast & 1 œuf",
    description: "Un seul œuf entier. Idéal si tu veux un petit-déj salé.",
    items: [
      { foodName: "Pain complet", quantity: 3 },
      { foodName: "Œuf entier", quantity: 1 },
      { foodName: "Blancs d'œufs", quantity: 200 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
      { foodName: "Banane", quantity: 1 },
      { foodName: "Beurre de cacahuète", quantity: 25 },
    ],
  },

  // ===== DÉJEUNER =====
  {
    slot: "LUNCH",
    variantKey: "default",
    displayName: "Poulet & riz",
    description: "Le classique. Préparation batch, se garde 3 jours au frigo.",
    items: [
      { foodName: "Blanc de poulet cuit", quantity: 180 },
      { foodName: "Riz cuit", quantity: 250 },
      { foodName: "Huile d'olive", quantity: 10 },
      { foodName: "Légumes (mix)", quantity: 200 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
      { foodName: "Pomme", quantity: 1 },
    ],
  },
  {
    slot: "LUNCH",
    variantKey: "thon-pates",
    displayName: "Thon & pâtes",
    description: "Sans cuisson de viande. 10 min chrono. Très économique.",
    items: [
      { foodName: "Thon nature en boîte", quantity: 150 },
      { foodName: "Pâtes cuites", quantity: 250 },
      { foodName: "Huile d'olive", quantity: 10 },
      { foodName: "Légumes (mix)", quantity: 200 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
      { foodName: "Pomme", quantity: 1 },
    ],
  },
  {
    slot: "LUNCH",
    variantKey: "poulet-pates",
    displayName: "Poulet & pâtes",
    description: "Variation avec pâtes au lieu du riz, mêmes macros.",
    items: [
      { foodName: "Blanc de poulet cuit", quantity: 180 },
      { foodName: "Pâtes cuites", quantity: 250 },
      { foodName: "Huile d'olive", quantity: 10 },
      { foodName: "Légumes (mix)", quantity: 200 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
      { foodName: "Pomme", quantity: 1 },
    ],
  },

  // ===== DÎNER =====
  {
    slot: "DINNER",
    variantKey: "default",
    displayName: "Steak haché & pdt",
    description: "Le classique du soir, riche en fer.",
    items: [
      { foodName: "Steak haché 5%", quantity: 170 },
      { foodName: "Pommes de terre cuites", quantity: 300 },
      { foodName: "Huile d'olive", quantity: 10 },
      { foodName: "Légumes (mix)", quantity: 200 },
      { foodName: "Pain complet", quantity: 2 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
    ],
  },
  {
    slot: "DINNER",
    variantKey: "omelette-pates",
    displayName: "Omelette & pâtes",
    description: "Économique. 15 min, batch facile.",
    items: [
      { foodName: "Œuf entier", quantity: 3 },
      { foodName: "Blancs d'œufs", quantity: 200 },
      { foodName: "Pâtes cuites", quantity: 250 },
      { foodName: "Huile d'olive", quantity: 10 },
      { foodName: "Légumes (mix)", quantity: 200 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
    ],
  },
  {
    slot: "DINNER",
    variantKey: "poulet-pdt",
    displayName: "Poulet & pdt",
    description: "Rotation viande. Pratique si tu as cuisiné du poulet le midi.",
    items: [
      { foodName: "Blanc de poulet cuit", quantity: 180 },
      { foodName: "Pommes de terre cuites", quantity: 300 },
      { foodName: "Huile d'olive", quantity: 10 },
      { foodName: "Légumes (mix)", quantity: 200 },
      { foodName: "Pain complet", quantity: 2 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
    ],
  },
];

async function main() {
  console.log("Seeding…");

  for (const e of exercises) {
    await prisma.exercise.upsert({
      where: { name: e.name },
      update: { ...e },
      create: { ...e },
    });
  }
  console.log(`  ✓ ${exercises.length} exercices`);

  for (const f of foods) {
    await prisma.food.upsert({
      where: { name: f.name },
      update: { ...f, unitGrams: f.unitGrams ?? null },
      create: { ...f, unitGrams: f.unitGrams ?? null },
    });
  }
  console.log(`  ✓ ${foods.length} aliments`);

  // On wipe le plan de base précédent (cascades sur Meal + MealItem)
  await prisma.mealPlan.deleteMany({ where: { isBase: true } });
  await prisma.userMealPreference.deleteMany();

  const allFoods = await prisma.food.findMany();
  const foodIdByName = new Map(allFoods.map((f) => [f.name, f.id]));

  const plan = await prisma.mealPlan.create({
    data: {
      label: "base",
      isBase: true,
      meals: {
        create: mealVariants.map((v) => ({
          slot: v.slot,
          variantKey: v.variantKey,
          displayName: v.displayName,
          description: v.description ?? null,
          items: {
            create: v.items.map((it) => ({
              foodId: foodIdByName.get(it.foodName)!,
              quantity: it.quantity,
            })),
          },
        })),
      },
    },
    include: { meals: true },
  });

  // Préférences par défaut : variante "default" pour chaque slot
  for (const slot of ["BREAKFAST", "LUNCH", "DINNER"] as const) {
    const def = plan.meals.find((m) => m.slot === slot && m.variantKey === "default");
    if (!def) throw new Error(`Variante "default" manquante pour slot ${slot}`);
    await prisma.userMealPreference.upsert({
      where: { slot },
      create: { slot, mealId: def.id },
      update: { mealId: def.id },
    });
  }

  console.log(`  ✓ Plan #${plan.id} : ${plan.meals.length} variantes`);
  console.log("Seed terminé ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
