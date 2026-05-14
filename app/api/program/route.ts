import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const program = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    include: {
      priorities: true,
      exercises: {
        where: { archived: false },
        orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
      },
    },
  });
  if (!program) return NextResponse.json(null);
  return NextResponse.json({
    id: program.id,
    split: program.split,
    daysPerWeek: program.daysPerWeek,
    daysLabels: JSON.parse(program.daysLabels) as string[],
    priorities: program.priorities.map((p) => ({
      muscleGroup: p.muscleGroup,
      priority: p.priority,
    })),
    exercises: program.exercises,
  });
}
