import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ProgramEditClient } from "./ProgramEditClient";
import { SPLIT_LABEL } from "@/lib/programGenerator";

export const dynamic = "force-dynamic";

export default async function ProgrammeEditPage() {
  const user = await requireUser();
  const program = await prisma.userProgram.findFirst({
    where: { userId: user.id, active: true },
    include: {
      exercises: {
        where: { archived: false },
        orderBy: [{ dayNumber: "asc" }, { orderIndex: "asc" }],
      },
    },
  });
  if (!program) redirect("/onboarding");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/profil" className="text-xs text-muted hover:text-accent">
          ← Profil
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Modifier le programme</h1>
        <p className="text-sm text-muted mt-1">
          {SPLIT_LABEL[program.split]} · {program.exercises.length} exercices
        </p>
      </div>
      <ProgramEditClient
        daysLabels={JSON.parse(program.daysLabels) as string[]}
        daysPerWeek={program.daysPerWeek}
        exercises={program.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          primaryMuscle: e.primaryMuscle,
          dayNumber: e.dayNumber,
          orderIndex: e.orderIndex,
          prescription: e.prescription,
          description: e.description,
          notes: e.notes,
        }))}
      />
    </div>
  );
}
