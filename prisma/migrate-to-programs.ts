// @ts-nocheck
/**
 * Migration one-shot : crée le catalogue ExerciseCatalog, puis pour chaque
 * utilisateur existant clone le programme legacy (table Exercise) en
 * UserProgram + UserExercise. Termine en migrant les WorkoutSet.exerciseId
 * vers userExerciseId.
 *
 * Idempotent : peut être relancé. Si un user a déjà un programme actif,
 * on skip la création (mais on continue le link des WorkoutSet orphelins).
 *
 * @ts-nocheck : pendant la transition, l'API du client utilise des champs
 * encore nullable (exerciseId) qui sont en fait toujours set pour la legacy
 * data — on évite le bruit de strict null checks.
 */

import { PrismaClient, type MuscleGroup, type SplitType } from "@prisma/client";
import { EXERCISE_CATALOG } from "../lib/exerciseCatalog";

const prisma = new PrismaClient();

const ALL_MUSCLES: MuscleGroup[] = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "ABS",
];

const DEFAULT_SPLIT: SplitType = "PPL_3";
const DEFAULT_DAYS_LABELS = ["Pull", "Legs", "Push"];

async function seedCatalog() {
  console.log(`→ Seed ExerciseCatalog (${EXERCISE_CATALOG.length} exos)`);
  for (const e of EXERCISE_CATALOG) {
    await prisma.exerciseCatalog.upsert({
      where: { name: e.name },
      create: {
        name: e.name,
        type: e.type,
        primaryMuscle: e.primaryMuscle,
        secondaryMuscles: e.secondaryMuscles?.join(",") ?? null,
        isCompound: e.isCompound,
        description: e.description ?? null,
      },
      update: {
        type: e.type,
        primaryMuscle: e.primaryMuscle,
        secondaryMuscles: e.secondaryMuscles?.join(",") ?? null,
        isCompound: e.isCompound,
        description: e.description ?? null,
      },
    });
  }
  console.log(`  ✓ catalogue à jour`);
}

async function createProgramsForUsers() {
  const users = await prisma.user.findMany();
  const legacyExos = await prisma.exercise.findMany({ orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }] });
  const catalogByName = new Map(
    (await prisma.exerciseCatalog.findMany()).map((c) => [c.name, c]),
  );

  for (const u of users) {
    const existing = await prisma.userProgram.findFirst({
      where: { userId: u.id, active: true },
    });
    if (existing) {
      console.log(`→ ${u.username} : programme déjà actif (id=${existing.id}), skip création`);
      continue;
    }
    console.log(`→ ${u.username} : création UserProgram (${DEFAULT_SPLIT})`);
    const program = await prisma.userProgram.create({
      data: {
        userId: u.id,
        split: DEFAULT_SPLIT,
        daysPerWeek: DEFAULT_DAYS_LABELS.length,
        daysLabels: JSON.stringify(DEFAULT_DAYS_LABELS),
        active: true,
        priorities: {
          create: ALL_MUSCLES.map((m) => ({ muscleGroup: m, priority: "MODERATE" as const })),
        },
      },
    });

    // Clone les legacy Exercise en UserExercise dans le programme du user
    for (const ex of legacyExos) {
      const catalog = catalogByName.get(ex.name);
      if (!catalog) {
        console.warn(`  ⚠ "${ex.name}" pas dans le catalog — UserExercise créé sans catalogId`);
      }
      await prisma.userExercise.create({
        data: {
          programId: program.id,
          catalogId: catalog?.id ?? null,
          name: ex.name,
          type: ex.type,
          primaryMuscle: catalog?.primaryMuscle ?? "CHEST", // fallback safe
          secondaryMuscles: catalog?.secondaryMuscles ?? null,
          dayNumber: ex.dayNumber,
          orderIndex: ex.orderIndex,
          prescription: ex.prescription,
          description: ex.description,
          archived: ex.archived,
        },
      });
    }
    console.log(`  ✓ ${legacyExos.length} UserExercise créés`);
  }
}

async function linkWorkoutSets() {
  // Pour chaque WorkoutSet avec exerciseId set mais userExerciseId null,
  // retrouver l'UserExercise correspondant dans le programme actif du user
  // qui possède la WorkoutSession parent.
  const orphans = await prisma.workoutSet.findMany({
    where: { userExerciseId: null, exerciseId: { not: null } },
    include: {
      exercise: true,
      session: { select: { userId: true } },
    },
  });
  if (orphans.length === 0) {
    console.log(`→ Aucun WorkoutSet à relier`);
    return;
  }
  console.log(`→ Linking ${orphans.length} WorkoutSet vers userExerciseId`);

  // Cache : { userId → { exerciseName → userExerciseId } }
  const cache = new Map<number, Map<string, number>>();
  async function getMapping(userId: number) {
    if (cache.has(userId)) return cache.get(userId)!;
    const program = await prisma.userProgram.findFirst({
      where: { userId, active: true },
      include: { exercises: { select: { id: true, name: true } } },
    });
    const map = new Map<string, number>();
    if (program) {
      for (const e of program.exercises) map.set(e.name, e.id);
    }
    cache.set(userId, map);
    return map;
  }

  let linked = 0;
  let missed = 0;
  for (const set of orphans) {
    const mapping = await getMapping(set.session.userId);
    const userExerciseId = set.exercise ? mapping.get(set.exercise.name) : null;
    if (userExerciseId == null) {
      missed++;
      continue;
    }
    await prisma.workoutSet.update({
      where: { id: set.id },
      data: { userExerciseId },
    });
    linked++;
  }
  console.log(`  ✓ ${linked} sets liés, ${missed} sans match (gardent exerciseId legacy)`);
}

async function main() {
  console.log("=== Migration vers UserProgram / UserExercise ===\n");
  await seedCatalog();
  await createProgramsForUsers();
  await linkWorkoutSets();
  console.log("\n✅ Migration terminée");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
