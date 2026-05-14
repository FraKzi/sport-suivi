// @ts-nocheck
/**
 * Migration one-shot : crée l'utilisateur "frakzi" (admin) puis rattache toutes
 * les données legacy à son compte. À exécuter une seule fois après le passage
 * du schéma au modèle multi-user.
 *
 * @ts-nocheck est intentionnel : le script utilise `userId: null` dans les
 * filtres updateMany, ce qui ne compile plus depuis que userId est NOT NULL
 * dans le schéma. Le script a fait son boulot — il est gardé en référence.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const USERNAME = "frakzi";
const PASSWORD = "frakzilucas1234";
// Phrase de récupération : générée au passage. À copier UNE FOIS et stocker (note,
// password manager…). Si tu la perds, tu peux relancer ce script — il regénère.
const RECOVERY_PHRASE = "frakzi lucas sport suivi montagne soleil";

async function main() {
  console.log("→ Création / mise à jour de l'utilisateur frakzi");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const recoveryHash = await bcrypt.hash(RECOVERY_PHRASE, 10);

  const user = await prisma.user.upsert({
    where: { username: USERNAME },
    update: { passwordHash, recoveryHash, isAdmin: true },
    create: { username: USERNAME, passwordHash, recoveryHash, isAdmin: true },
  });
  console.log(`  ✓ user id=${user.id} username=${user.username} isAdmin=${user.isAdmin}`);
  console.log(`  ⚠ Phrase de récupération : "${RECOVERY_PHRASE}"`);
  console.log(`    → Note-la quelque part. Elle ne sera plus affichée.`);

  const userId = user.id;

  console.log("→ Backfill des userId sur les tables legacy");
  // updateMany avec WHERE userId: null = pas de double rattachement si déjà fait
  const ops: { name: string; count: number }[] = [];

  const profileRes = await prisma.userProfile.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "UserProfile", count: profileRes.count });

  const snapshotRes = await prisma.profileSnapshot.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "ProfileSnapshot", count: snapshotRes.count });

  const weightRes = await prisma.weightLog.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "WeightLog", count: weightRes.count });

  const measureRes = await prisma.bodyMeasurement.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "BodyMeasurement", count: measureRes.count });

  const dailyRes = await prisma.dailyLog.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "DailyLog", count: dailyRes.count });

  const sessionRes = await prisma.workoutSession.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "WorkoutSession", count: sessionRes.count });

  const planRes = await prisma.mealPlan.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "MealPlan", count: planRes.count });

  const consumRes = await prisma.mealConsumption.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "MealConsumption", count: consumRes.count });

  const prefRes = await prisma.userMealPreference.updateMany({
    where: { userId: null },
    data: { userId },
  });
  ops.push({ name: "UserMealPreference", count: prefRes.count });

  for (const o of ops) {
    console.log(`  ✓ ${o.name.padEnd(20)} ${o.count} ligne(s) rattachée(s)`);
  }

  console.log("\n→ Migration terminée. Tu peux maintenant te connecter avec :");
  console.log(`    username : ${USERNAME}`);
  console.log(`    password : (celui que tu as fourni)`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
