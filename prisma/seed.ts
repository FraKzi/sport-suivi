import { PrismaClient } from "@prisma/client";

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
];

// ---------- Plan de base (issu du PDF) ----------
const basePlan: { name: string; items: { foodName: string; quantity: number }[] }[] = [
  {
    name: "Petit-déjeuner",
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
    name: "Déjeuner",
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
    name: "Dîner",
    items: [
      { foodName: "Steak haché 5%", quantity: 170 },
      { foodName: "Pommes de terre cuites", quantity: 300 },
      { foodName: "Huile d'olive", quantity: 10 },
      { foodName: "Légumes (mix)", quantity: 200 },
      { foodName: "Pain complet", quantity: 2 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
    ],
  },
];

function macrosFor(qty: number, food: typeof foods[number]) {
  const g = food.unit === "piece" && food.unitGrams ? qty * food.unitGrams : qty;
  const factor = g / 100;
  return {
    kcal: food.kcalPer100 * factor,
    p: food.proteinPer100 * factor,
    c: food.carbsPer100 * factor,
    f: food.fatPer100 * factor,
  };
}

async function main() {
  console.log("Seeding…");

  // --- Exercices (upsert)
  for (const e of exercises) {
    await prisma.exercise.upsert({
      where: { name: e.name },
      update: { ...e },
      create: { ...e },
    });
  }
  console.log(`  ✓ ${exercises.length} exercices`);

  // --- Foods (upsert)
  for (const f of foods) {
    await prisma.food.upsert({
      where: { name: f.name },
      update: { ...f, unitGrams: f.unitGrams ?? null },
      create: { ...f, unitGrams: f.unitGrams ?? null },
    });
  }
  console.log(`  ✓ ${foods.length} aliments`);

  // --- Plan de base (recréé proprement)
  const existingBase = await prisma.mealPlan.findFirst({ where: { isBase: true } });
  if (existingBase) {
    await prisma.mealPlan.delete({ where: { id: existingBase.id } });
  }

  let totK = 0, totP = 0, totC = 0, totF = 0;
  for (const meal of basePlan) {
    for (const it of meal.items) {
      const food = foods.find((f) => f.name === it.foodName)!;
      const m = macrosFor(it.quantity, food);
      totK += m.kcal; totP += m.p; totC += m.c; totF += m.f;
    }
  }

  const allFoods = await prisma.food.findMany();
  const foodIdByName = new Map(allFoods.map((f) => [f.name, f.id]));

  const plan = await prisma.mealPlan.create({
    data: {
      label: "base",
      isBase: true,
      totalKcal: Math.round(totK),
      totalProtein: Math.round(totP),
      totalCarbs: Math.round(totC),
      totalFat: Math.round(totF),
      meals: {
        create: basePlan.map((m, idx) => ({
          name: m.name,
          orderIndex: idx,
          items: {
            create: m.items.map((it) => ({
              foodId: foodIdByName.get(it.foodName)!,
              quantity: it.quantity,
            })),
          },
        })),
      },
    },
  });
  console.log(`  ✓ Plan de base #${plan.id} : ${Math.round(totK)} kcal | ${Math.round(totP)}P / ${Math.round(totC)}C / ${Math.round(totF)}F`);

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
