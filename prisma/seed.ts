import { PrismaClient, MealSlot } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- Exercices (programme Push / Pull / Legs) ----------
// Day 1 = Pull, Day 2 = Legs, Day 3 = Push
const exercises: {
  name: string;
  type: "POLY" | "ISO";
  dayNumber: number;
  orderIndex: number;
  prescription: string;
  description?: string;
  muscleGroups?: string;
}[] = [
  // ========== JOUR 1 — PULL ==========
  {
    name: "Tirage vertical poulie",
    type: "POLY", dayNumber: 1, orderIndex: 1, prescription: "4×8-12",
    description: "Vidéo 1:23 — tirage à la poulie haute, prise large. Construit la largeur du dos.",
    muscleGroups: "Dos · Biceps",
  },
  {
    name: "Tirage horizontal buste appuyé",
    type: "POLY", dayNumber: 1, orderIndex: 2, prescription: "4×8-12",
    description: "Vidéo 5:30 — rowing avec appui pectoral. Isole le dos sans triche lombaire.",
    muscleGroups: "Dos · Biceps",
  },
  {
    name: "Tirage croisé unilatéral",
    type: "ISO", dayNumber: 1, orderIndex: 3, prescription: "3×12-15",
    description: "Vidéo 7:00 — Cross body lat pull-around. Câble unilatéral, étirement maximal du grand dorsal.",
    muscleGroups: "Dos (lats)",
  },
  {
    name: "Rowing Pendlay",
    type: "POLY", dayNumber: 1, orderIndex: 4, prescription: "3×6-8",
    description: "Vidéo 7:26 — barre au sol entre chaque rep. Renforce explicitement les lats avec gros stimulus neural.",
    muscleGroups: "Dos · Biceps",
  },
  {
    name: "Écarté inversé poulie",
    type: "ISO", dayNumber: 1, orderIndex: 5, prescription: "3×15-20",
    description: "Vidéo 8:45 — pense à \"sweep\" (cf 9:02). Cible deltoïdes postérieurs, santé scapulaire.",
    muscleGroups: "Épaules post.",
  },
  {
    name: "Curl biceps poulie",
    type: "ISO", dayNumber: 1, orderIndex: 6, prescription: "3×10-15",
    description: "Vidéo 10:44 — tension constante grâce au câble.",
    muscleGroups: "Biceps",
  },

  // ========== JOUR 2 — LEGS ==========
  {
    name: "Squat barre",
    type: "POLY", dayNumber: 2, orderIndex: 1, prescription: "4×6-10",
    description: "Vidéo 13:40 — Barbell back squat, roi des quadriceps. Descends jusqu'à parallèle minimum.",
    muscleGroups: "Quadriceps · Fessiers",
  },
  {
    name: "Soulevé de terre roumain",
    type: "POLY", dayNumber: 2, orderIndex: 2, prescription: "4×8-12",
    description: "Vidéo 15:05 — RDL barre libre ou Smith machine. Focus ischios étirés, charnière de hanche.",
    muscleGroups: "Ischios · Fessiers",
  },
  {
    name: "Leg extension",
    type: "ISO", dayNumber: 2, orderIndex: 3, prescription: "3×10-15",
    description: "Vidéo 19:40 — Quad extension (Prime Curl). Isolation pure quadriceps.",
    muscleGroups: "Quadriceps",
  },
  {
    name: "Leg curl",
    type: "ISO", dayNumber: 2, orderIndex: 4, prescription: "3×10-15",
    description: "Vidéo 22:19 — couché ou assis selon machine. Pic de tension en flexion complète.",
    muscleGroups: "Ischios",
  },

  // ========== JOUR 3 — PUSH ==========
  {
    name: "Développé couché barre",
    type: "POLY", dayNumber: 3, orderIndex: 1, prescription: "4×6-10",
    description: "Vidéo 26:03 — Bench press medium grip. Base pectorale, charge maximale.",
    muscleGroups: "Pecs · Triceps · Épaules ant.",
  },
  {
    name: "Écarté à la poulie",
    type: "ISO", dayNumber: 3, orderIndex: 2, prescription: "3×12-15",
    description: "Vidéo 27:53 — Cable fly. Étirement pectoral en tension constante.",
    muscleGroups: "Pecs",
  },
  {
    name: "Élévation latérale",
    type: "ISO", dayNumber: 3, orderIndex: 3, prescription: "4×12-20",
    description: "Vidéo 30:45 — Modified lateral raise, version corrigée. Cible deltoïde latéral.",
    muscleGroups: "Épaules (deltoïde latéral)",
  },
  {
    name: "Extension triceps poulie",
    type: "ISO", dayNumber: 3, orderIndex: 4, prescription: "3×10-15",
    description: "Vidéo 31:35 — Tricep pushdown câble. Coudes fixes près du corps.",
    muscleGroups: "Triceps",
  },
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
  // Alternative protéinée maigre quand pas de blancs d'œufs
  { name: "Jambon de poulet maigre", unit: "g",   kcalPer100: 110, proteinPer100: 22,  carbsPer100: 1,   fatPer100: 2 },
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
    description: "Le petit-déj de référence avec blancs d'œufs. À garder si tu en trouves (Decathlon, Picard, Auchan rayon sport).",
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
    variantKey: "oeufs-skyr",
    displayName: "Œufs & avoine — skyr",
    description: "Sans blancs d'œufs. Skyr 0% comme protéine maigre de remplacement (macros quasi identiques).",
    items: [
      { foodName: "Flocons d'avoine", quantity: 100 },
      { foodName: "Lait demi-écrémé", quantity: 300 },
      { foodName: "Œuf entier", quantity: 3 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 200 },
      { foodName: "Banane", quantity: 1 },
      { foodName: "Beurre de cacahuète", quantity: 15 },
    ],
  },
  {
    slot: "BREAKFAST",
    variantKey: "oeufs-jambon",
    displayName: "Œufs & jambon de poulet",
    description: "Sans blancs d'œufs. 100g de jambon de poulet maigre apporte ~22g de protéines pour 110 kcal — équivalent salé du blanc d'œuf.",
    items: [
      { foodName: "Flocons d'avoine", quantity: 100 },
      { foodName: "Lait demi-écrémé", quantity: 300 },
      { foodName: "Œuf entier", quantity: 3 },
      { foodName: "Jambon de poulet maigre", quantity: 100 },
      { foodName: "Banane", quantity: 1 },
      { foodName: "Beurre de cacahuète", quantity: 15 },
    ],
  },
  {
    slot: "BREAKFAST",
    variantKey: "oeufs-entiers",
    displayName: "Tout-œufs & avoine",
    description: "Sans blancs d'œufs. 5 œufs entiers couvrent la protéine. Plus riche en lipides (~+12g) — éviter combo dîner gras.",
    items: [
      { foodName: "Flocons d'avoine", quantity: 100 },
      { foodName: "Lait demi-écrémé", quantity: 300 },
      { foodName: "Œuf entier", quantity: 5 },
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
    description: "Petit-déj salé original avec blancs. À garder si tu en trouves.",
    items: [
      { foodName: "Pain complet", quantity: 3 },
      { foodName: "Œuf entier", quantity: 1 },
      { foodName: "Blancs d'œufs", quantity: 200 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 150 },
      { foodName: "Banane", quantity: 1 },
      { foodName: "Beurre de cacahuète", quantity: 25 },
    ],
  },
  {
    slot: "BREAKFAST",
    variantKey: "toast-skyr",
    displayName: "Toast & œufs — skyr",
    description: "Sans blancs : 2 œufs entiers + skyr boosté à 300g (compense les protéines des blancs).",
    items: [
      { foodName: "Pain complet", quantity: 3 },
      { foodName: "Œuf entier", quantity: 2 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 300 },
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
    description: "Omelette originale avec blancs d'œufs. À garder si tu en trouves. 15 min, batch facile.",
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
    variantKey: "omelette-skyr",
    displayName: "Omelette & pâtes — skyr",
    description: "Sans blancs : 5 œufs entiers + skyr boosté à 200g. Plus de lipides (~+12g) mais protéines préservées.",
    items: [
      { foodName: "Œuf entier", quantity: 5 },
      { foodName: "Pâtes cuites", quantity: 250 },
      { foodName: "Huile d'olive", quantity: 10 },
      { foodName: "Légumes (mix)", quantity: 200 },
      { foodName: "Skyr / Fromage blanc 0%", quantity: 200 },
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

  // Migration : supprimer les Exercises absents du nouveau seed (et les sessions
  // qui les référencent). Idempotent : sans changement de programme, no-op.
  const currentNames = exercises.map((e) => e.name);
  const orphans = await prisma.exercise.findMany({
    where: { name: { notIn: currentNames } },
    select: { id: true, name: true },
  });
  if (orphans.length > 0) {
    const orphanIds = orphans.map((o) => o.id);
    const affectedSessions = await prisma.workoutSession.findMany({
      where: { sets: { some: { exerciseId: { in: orphanIds } } } },
      select: { id: true },
    });
    if (affectedSessions.length > 0) {
      await prisma.workoutSession.deleteMany({
        where: { id: { in: affectedSessions.map((s) => s.id) } },
      });
      console.log(`  ⚠ ${affectedSessions.length} session(s) supprimée(s) (programme remplacé)`);
    }
    await prisma.exercise.deleteMany({ where: { id: { in: orphanIds } } });
    console.log(`  ⚠ ${orphans.length} exercice(s) obsolète(s) supprimé(s) : ${orphans.map((o) => o.name).join(", ")}`);
  }

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

  const allFoods = await prisma.food.findMany();
  const foodIdByName = new Map(allFoods.map((f) => [f.name, f.id]));

  // Multi-user : on (re)crée le plan de base pour CHAQUE utilisateur en DB.
  // Les MealConsumption historiques pointent vers les anciens Meal ids — on
  // ne supprime pas les anciens plans, on les passe juste à isBase=false.
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.warn("  ⚠ Aucun User en DB — skip du seed plan alimentaire.");
    console.warn("     Lance d'abord `npx tsx prisma/migrate-multiuser.ts` pour créer frakzi.");
  }
  for (const u of users) {
    await prisma.mealPlan.updateMany({
      where: { userId: u.id, isBase: true },
      data: { isBase: false },
    });
    await prisma.userMealPreference.deleteMany({ where: { userId: u.id } });

    const plan = await prisma.mealPlan.create({
      data: {
        userId: u.id,
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

    for (const slot of ["BREAKFAST", "LUNCH", "DINNER"] as const) {
      const def = plan.meals.find((m) => m.slot === slot && m.variantKey === "default");
      if (!def) throw new Error(`Variante "default" manquante pour slot ${slot}`);
      await prisma.userMealPreference.upsert({
        where: { userId_slot: { userId: u.id, slot } },
        create: { userId: u.id, slot, mealId: def.id },
        update: { mealId: def.id },
      });
    }

    console.log(`  ✓ ${u.username} → plan #${plan.id} (${plan.meals.length} variantes)`);
  }
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
