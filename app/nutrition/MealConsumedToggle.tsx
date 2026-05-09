"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MealSlot } from "@prisma/client";

type Props = {
  slot: MealSlot;
  mealId: number;
  consumed: boolean;
  /** Date YYYY-MM-DD (défaut : aujourd'hui en local). */
  date?: string;
};

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MealConsumedToggle({ slot, mealId, consumed, date }: Props) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(consumed);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !optimistic;
    setOptimistic(next);
    setBusy(true);
    const ymd = date ?? todayYmd();
    try {
      const res = next
        ? await fetch("/api/meal-consumption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: ymd, slot, mealId }),
          })
        : await fetch("/api/meal-consumption", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: ymd, slot }),
          });
      if (!res.ok) {
        setOptimistic(consumed); // rollback
      } else {
        startTransition(() => router.refresh());
      }
    } catch {
      setOptimistic(consumed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || pending}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        optimistic
          ? "bg-success/15 text-success border-success/30 hover:bg-success/25"
          : "bg-surface2 text-muted border-border hover:text-text hover:border-muted"
      } ${busy ? "opacity-60" : ""}`}
      aria-pressed={optimistic}
    >
      <span aria-hidden>{optimistic ? "✓" : "○"}</span>
      <span>{optimistic ? "Mangé" : "Marquer mangé"}</span>
    </button>
  );
}
