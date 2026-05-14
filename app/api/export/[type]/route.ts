import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toCSV, ymd } from "@/lib/csv";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["workouts", "weights", "measurements", "daily", "meals"] as const;
type ExportType = (typeof VALID_TYPES)[number];

function isValidType(t: string): t is ExportType {
  return (VALID_TYPES as readonly string[]).includes(t);
}

export async function GET(_req: Request, { params }: { params: { type: string } }) {
  const user = await requireUser();
  const type = params.type;
  if (!isValidType(type)) {
    return NextResponse.json({ error: "type invalide" }, { status: 400 });
  }

  let csv = "";
  let filename = "";
  const today = ymd(new Date());

  switch (type) {
    case "workouts": {
      const sets = await prisma.workoutSet.findMany({
        where: { session: { userId: user.id } },
        include: { session: true, exercise: true },
        orderBy: [{ session: { date: "asc" } }, { sessionId: "asc" }, { setNumber: "asc" }],
      });
      const rows = sets.map((s) => ({
        date: ymd(s.session.date),
        session_id: s.sessionId,
        day_number: s.session.dayNumber,
        exercise: s.exercise.name,
        type: s.exercise.type,
        muscle_groups: s.exercise.muscleGroups ?? "",
        set_number: s.setNumber,
        weight_kg: s.weightKg ?? "",
        reps: s.reps ?? "",
        rpe: s.rpe ?? "",
        volume_kg: s.weightKg && s.reps ? s.weightKg * s.reps : "",
        body_weight: s.session.bodyWeight ?? "",
        duration_min: s.session.durationMin ?? "",
        session_notes: s.session.notes ?? "",
      }));
      csv = toCSV(rows);
      filename = `sport-suivi-workouts-${today}.csv`;
      break;
    }
    case "weights": {
      const logs = await prisma.weightLog.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
      });
      const rows = logs.map((l) => ({
        date: ymd(l.date),
        weight_kg: l.weightKg,
        notes: l.notes ?? "",
      }));
      csv = toCSV(rows);
      filename = `sport-suivi-weights-${today}.csv`;
      break;
    }
    case "measurements": {
      const ms = await prisma.bodyMeasurement.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
      });
      const rows = ms.map((m) => ({
        date: ymd(m.date),
        waist_cm: m.waistCm ?? "",
        hip_cm: m.hipCm ?? "",
        neck_cm: m.neckCm ?? "",
        chest_cm: m.chestCm ?? "",
        arm_cm: m.armCm ?? "",
        thigh_cm: m.thighCm ?? "",
        body_fat_pct: m.bodyFatPct ?? "",
        notes: m.notes ?? "",
      }));
      csv = toCSV(rows);
      filename = `sport-suivi-measurements-${today}.csv`;
      break;
    }
    case "daily": {
      const logs = await prisma.dailyLog.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
      });
      const rows = logs.map((l) => ({
        date: ymd(l.date),
        steps: l.steps,
        water_ml: l.waterMl,
        water_l: (l.waterMl / 1000).toFixed(2),
        notes: l.notes ?? "",
      }));
      csv = toCSV(rows);
      filename = `sport-suivi-daily-${today}.csv`;
      break;
    }
    case "meals": {
      const list = await prisma.mealConsumption.findMany({
        where: { userId: user.id },
        include: { meal: true },
        orderBy: [{ date: "asc" }, { slot: "asc" }],
      });
      const rows = list.map((c) => ({
        date: ymd(c.date),
        slot: c.slot,
        meal_id: c.mealId,
        meal_name: c.meal.displayName,
        variant_key: c.meal.variantKey,
      }));
      csv = toCSV(rows);
      filename = `sport-suivi-meals-${today}.csv`;
      break;
    }
  }

  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
