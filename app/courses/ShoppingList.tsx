"use client";
import { useEffect, useState } from "react";
import type { MealSlot } from "@prisma/client";
import { Card, CardTitle, Field, Button, Badge } from "@/components/ui";

type Item = { foodId: number; name: string; unit: string; perDay: number };
type ActiveVariant = { slot: MealSlot; displayName: string };
type Props = { items: Item[]; activeVariants: ActiveVariant[] };

const STORAGE_KEY = "sport-suivi:shopping-list:v1";
const SLOT_LABEL: Record<MealSlot, string> = {
  BREAKFAST: "Petit-déj",
  LUNCH: "Déjeuner",
  DINNER: "Dîner",
};

function formatQty(qty: number, unit: string): string {
  if (unit === "piece") {
    return `${Math.ceil(qty)}×`;
  }
  if (unit === "ml") {
    const ml = Math.ceil(qty / 10) * 10;
    return ml >= 1000 ? `${(ml / 1000).toFixed(2)} L` : `${ml} ml`;
  }
  const g = Math.ceil(qty / 10) * 10;
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`;
}

export function ShoppingList({ items, activeVariants }: Props) {
  const [days, setDays] = useState(7);
  const [daysInput, setDaysInput] = useState("7");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.days === "number") {
          setDays(parsed.days);
          setDaysInput(String(parsed.days));
        }
        if (parsed.checked && typeof parsed.checked === "object") setChecked(parsed.checked);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ days, checked }));
  }, [days, checked, hydrated]);

  function onChangeDays(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDaysInput(raw);
    // Met à jour `days` uniquement si la saisie est un entier valide dans la plage,
    // sinon on laisse le champ libre pendant la frappe.
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 30) setDays(n);
  }

  function onBlurDays() {
    // Au blur on normalise : valeur invalide / vide → fallback à la dernière valeur valide
    const n = parseInt(daysInput, 10);
    const clamped = Number.isFinite(n) ? Math.max(1, Math.min(30, n)) : days;
    setDays(clamped);
    setDaysInput(String(clamped));
  }

  function toggle(id: number) {
    setChecked((s) => ({ ...s, [id]: !s[id] }));
  }

  function reset() {
    setChecked({});
  }

  const totalChecked = items.filter((i) => checked[i.foodId]).length;
  const allDone = items.length > 0 && totalChecked === items.length;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Liste de courses</h1>
        <span className="text-xs text-muted">
          {totalChecked} / {items.length} cochés
        </span>
      </div>

      <Card>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="flex items-end gap-3">
            <Field label="Nombre de jours" hint="Quantités calculées sur cette durée">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={daysInput}
                onChange={onChangeDays}
                onBlur={onBlurDays}
                onFocus={(e) => e.currentTarget.select()}
                className="w-24"
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            {allDone && (
              <Badge tone="success">✓ Terminé</Badge>
            )}
            <Button
              variant={allDone ? "primary" : "ghost"}
              onClick={reset}
              disabled={totalChecked === 0}
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted">Variantes actives :</span>
          {activeVariants.map((v) => (
            <span key={v.slot} className="text-xs">
              <span className="text-muted">{SLOT_LABEL[v.slot]}</span>{" "}
              <span className="text-text">{v.displayName}</span>
            </span>
          ))}
        </div>
      </Card>

      <Card>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Aucun aliment dans le plan actif.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const isChecked = !!checked[item.foodId];
              return (
                <li key={item.foodId} className="py-1">
                  <label
                    htmlFor={`item-${item.foodId}`}
                    className="flex items-center gap-3 cursor-pointer py-1 -mx-2 px-2 rounded hover:bg-surface2"
                  >
                    <input
                      type="checkbox"
                      id={`item-${item.foodId}`}
                      checked={isChecked}
                      onChange={() => toggle(item.foodId)}
                      className="w-5 h-5 cursor-pointer accent-accent shrink-0"
                    />
                    <span
                      className={`flex-1 flex items-baseline justify-between gap-3 transition-colors ${
                        isChecked ? "line-through text-muted" : ""
                      }`}
                    >
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm tabular-nums shrink-0">
                        {formatQty(item.perDay * days, item.unit)}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-xs text-muted">
        Liste construite à partir des variantes actives dans <span className="text-text">/nutrition</span> et de tes cibles macro. Quantités arrondies au-dessus (10 g / 10 ml / 1 pièce) pour avoir une marge. État sauvegardé dans le navigateur — change de variante ou de durée à volonté, les cases déjà cochées sont conservées par aliment.
      </p>
    </div>
  );
}
