"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { MuscleGroup, MusclePriorityLevel } from "@prisma/client";
import { MUSCLE_LABEL, PRIORITY_LABEL, ALL_MUSCLES } from "@/lib/programGenerator";

const COLUMNS: MusclePriorityLevel[] = ["MAINTENANCE", "MODERATE", "EMPHASIZED"];

const COLUMN_HINT: Record<MusclePriorityLevel, string> = {
  MAINTENANCE: "~8 sets/sem · garder le niveau",
  MODERATE: "~12 sets/sem · progression standard",
  EMPHASIZED: "~17 sets/sem · prioritaire",
};

const COLUMN_TONE: Record<MusclePriorityLevel, string> = {
  MAINTENANCE: "border-muted/40 bg-surface2/50",
  MODERATE: "border-accent/40 bg-accent/5",
  EMPHASIZED: "border-warning/40 bg-warning/5",
};

const COLUMN_BADGE: Record<MusclePriorityLevel, string> = {
  MAINTENANCE: "bg-surface2 text-muted",
  MODERATE: "bg-accent/20 text-accent",
  EMPHASIZED: "bg-warning/20 text-warning",
};

function MuscleChip({ id, label, isDragging }: { id: string; label: string; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging: dragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      className={`px-3 py-2 rounded-md text-sm font-medium bg-surface border border-border cursor-grab active:cursor-grabbing touch-none select-none ${
        dragging || isDragging ? "opacity-30" : ""
      }`}
      aria-label={`Glisser ${label}`}
    >
      {label}
    </button>
  );
}

function Column({
  level,
  muscles,
}: {
  level: MusclePriorityLevel;
  muscles: MuscleGroup[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: level });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 ${COLUMN_TONE[level]} p-3 transition-colors ${
        isOver ? "border-accent" : ""
      } min-h-[180px]`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${COLUMN_BADGE[level]}`}>
          {PRIORITY_LABEL[level]}
        </span>
        <span className="text-[10px] text-muted">{muscles.length}</span>
      </div>
      <p className="text-[11px] text-muted mb-3">{COLUMN_HINT[level]}</p>
      <div className="flex flex-wrap gap-2">
        {muscles.map((m) => (
          <MuscleChip key={m} id={m} label={MUSCLE_LABEL[m]} />
        ))}
        {muscles.length === 0 && (
          <span className="text-xs text-muted italic">— vide —</span>
        )}
      </div>
    </div>
  );
}

export function MusclePrioritiesDnD({
  value,
  onChange,
}: {
  value: Record<MuscleGroup, MusclePriorityLevel>;
  onChange: (next: Record<MuscleGroup, MusclePriorityLevel>) => void;
}) {
  const [active, setActive] = useState<MuscleGroup | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function onDragStart(e: DragStartEvent) {
    setActive(e.active.id as MuscleGroup);
  }
  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const muscle = e.active.id as MuscleGroup;
    const target = e.over?.id as MusclePriorityLevel | undefined;
    if (!target || !COLUMNS.includes(target)) return;
    if (value[muscle] === target) return;
    onChange({ ...value, [muscle]: target });
  }

  const byColumn: Record<MusclePriorityLevel, MuscleGroup[]> = {
    MAINTENANCE: [],
    MODERATE: [],
    EMPHASIZED: [],
  };
  for (const m of ALL_MUSCLES) byColumn[value[m]].push(m);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="grid md:grid-cols-3 gap-3">
        {COLUMNS.map((c) => (
          <Column key={c} level={c} muscles={byColumn[c]} />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <div className="px-3 py-2 rounded-md text-sm font-medium bg-accent text-white border border-accent shadow-lg">
            {MUSCLE_LABEL[active]}
          </div>
        ) : null}
      </DragOverlay>
      <p className="text-[11px] text-muted mt-3">
        Astuce : sur mobile, maintiens un muscle ~0,1s puis déplace-le. Au clavier :
        Tab + Espace pour saisir, flèches pour bouger, Espace pour relâcher.
      </p>
    </DndContext>
  );
}
