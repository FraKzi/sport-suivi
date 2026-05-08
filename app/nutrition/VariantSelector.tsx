"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MealSlot } from "@prisma/client";

type Variant = {
  id: number;
  variantKey: string;
  displayName: string;
  description: string | null;
};

type Props = {
  slot: MealSlot;
  activeId: number;
  variants: Variant[];
};

export function VariantSelector({ slot, activeId, variants }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useState(activeId);

  const active = variants.find((v) => v.id === optimisticId) ?? variants.find((v) => v.id === activeId);

  async function pick(id: number) {
    if (id === optimisticId) return;
    setOptimisticId(id);
    const res = await fetch("/api/meal-plan/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, mealId: id }),
    });
    if (!res.ok) {
      setOptimisticId(activeId); // rollback
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => {
          const isActive = v.id === optimisticId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => pick(v.id)}
              disabled={pending}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                isActive
                  ? "bg-accent text-white border-accent"
                  : "bg-surface2 text-muted border-border hover:text-text hover:border-muted"
              }`}
            >
              {v.displayName}
            </button>
          );
        })}
      </div>
      {active?.description && (
        <p className="text-xs text-muted italic">{active.description}</p>
      )}
    </div>
  );
}
