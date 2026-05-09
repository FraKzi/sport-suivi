"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardTitle, Field, Button, Badge, Stat } from "@/components/ui";
import { classifyBodyFat, navyBodyFat } from "@/lib/bodyComp";

type Sex = "MALE" | "FEMALE";

type Profile = {
  sex: Sex;
  heightCm: number;
  weightKg: number;
} | null;

type Measurement = {
  id: number;
  date: string;
  waistCm: number | null;
  hipCm: number | null;
  neckCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  bodyFatPct: number | null;
  notes: string | null;
};

type Props = { profile: Profile; measurements: Measurement[] };

const FIELDS: { key: keyof Measurement; label: string; placeholder: string; min: number; max: number }[] = [
  { key: "waistCm", label: "Tour de taille (cm)", placeholder: "ex: 82", min: 30, max: 200 },
  { key: "hipCm", label: "Tour de hanches (cm)", placeholder: "ex: 95", min: 30, max: 200 },
  { key: "neckCm", label: "Tour de cou (cm)", placeholder: "ex: 38", min: 20, max: 80 },
  { key: "chestCm", label: "Tour de poitrine (cm)", placeholder: "ex: 100", min: 50, max: 200 },
  { key: "armCm", label: "Tour de bras (cm)", placeholder: "ex: 36", min: 15, max: 80 },
  { key: "thighCm", label: "Tour de cuisse (cm)", placeholder: "ex: 58", min: 30, max: 120 },
  { key: "bodyFatPct", label: "% MG (manuel)", placeholder: "ex: 15.5", min: 2, max: 60 },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function MeasurementsView({ profile, measurements }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Dernière mesure
  const latest = measurements[0] ?? null;

  // Préview Navy en live (sur les valeurs du form, ou la dernière mesure si form vide)
  const preview = useMemo(() => {
    if (!profile) return null;
    const waist = parseFloat(form.waistCm) || latest?.waistCm || 0;
    const neck = parseFloat(form.neckCm) || latest?.neckCm || 0;
    const hip = parseFloat(form.hipCm) || latest?.hipCm || 0;
    if (waist <= 0 || neck <= 0) return null;
    return navyBodyFat({
      sex: profile.sex,
      heightCm: profile.heightCm,
      waistCm: waist,
      neckCm: neck,
      hipCm: hip,
    });
  }, [form, latest, profile]);

  // Données chart : tour de taille + % MG (Navy ou manuel) + poids dérivé du Navy
  const chartData = useMemo(() => {
    return [...measurements]
      .reverse()
      .map((m) => {
        let bf: number | null = m.bodyFatPct;
        if (bf == null && profile && m.waistCm && m.neckCm) {
          bf = navyBodyFat({
            sex: profile.sex,
            heightCm: profile.heightCm,
            waistCm: m.waistCm,
            neckCm: m.neckCm,
            hipCm: m.hipCm ?? undefined,
          });
        }
        return {
          label: formatDate(m.date),
          taille: m.waistCm,
          bras: m.armCm,
          mg: bf,
        };
      });
  }, [measurements, profile]);

  // Delta vs première mesure
  const firstWaist = measurements.length > 0 ? measurements[measurements.length - 1].waistCm : null;
  const latestWaist = latest?.waistCm ?? null;
  const waistDelta =
    firstWaist != null && latestWaist != null && measurements.length > 1
      ? latestWaist - firstWaist
      : null;

  async function save() {
    setSaving(true);
    setMsg("");
    const payload: Record<string, number | null> = {};
    for (const { key, min, max } of FIELDS) {
      const raw = form[key as string];
      if (raw == null || raw === "") continue;
      const n = parseFloat(raw);
      if (!Number.isFinite(n)) continue;
      if (n < min || n > max) {
        setMsg(`${key} hors plage (${min}-${max})`);
        setSaving(false);
        return;
      }
      payload[key as string] = n;
    }
    if (Object.keys(payload).length === 0) {
      setMsg("Renseigne au moins une mesure.");
      setSaving(false);
      return;
    }
    if (notes.trim()) payload.notes = notes.trim() as any;
    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setForm({});
      setNotes("");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg("Erreur : " + JSON.stringify(j));
    }
  }

  async function del(id: number) {
    if (!confirm("Supprimer cette mesure ?")) return;
    const res = await fetch(`/api/measurements/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  // %MG calculé pour la dernière mesure (Navy si pas de manuel)
  const latestBf = useMemo(() => {
    if (!latest) return null;
    if (latest.bodyFatPct != null) return { value: latest.bodyFatPct, source: "manuel" as const };
    if (!profile || !latest.waistCm || !latest.neckCm) return null;
    const bf = navyBodyFat({
      sex: profile.sex,
      heightCm: profile.heightCm,
      waistCm: latest.waistCm,
      neckCm: latest.neckCm,
      hipCm: latest.hipCm ?? undefined,
    });
    return bf != null ? { value: bf, source: "Navy" as const } : null;
  }, [latest, profile]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Mesures corporelles</h1>
        <p className="text-sm text-muted mt-1">
          Suivi des mensurations + % masse grasse calculé automatiquement (formule US Navy)
          ou saisi manuellement (impédancemètre, DEXA…).
        </p>
      </div>

      {!profile && (
        <Card>
          <p className="text-sm text-muted">
            Renseigne ton profil (taille, sexe) pour activer le calcul automatique du % MG.
          </p>
        </Card>
      )}

      {/* Stats latest */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Tour de taille"
            value={latest.waistCm?.toFixed(1) ?? "–"}
            unit="cm"
            hint={
              waistDelta != null
                ? `${waistDelta >= 0 ? "+" : ""}${waistDelta.toFixed(1)} cm depuis le début`
                : undefined
            }
          />
          <Stat
            label="% Masse grasse"
            value={latestBf ? latestBf.value.toFixed(1) : "–"}
            unit="%"
            hint={
              latestBf && profile
                ? `${classifyBodyFat(latestBf.value, profile.sex)} (${latestBf.source})`
                : undefined
            }
          />
          <Stat label="Tour de bras" value={latest.armCm?.toFixed(1) ?? "–"} unit="cm" />
          <Stat
            label="Dernière mesure"
            value={formatDate(latest.date)}
            hint={`${measurements.length} entrée${measurements.length > 1 ? "s" : ""}`}
          />
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <Card>
          <CardTitle>Évolution</CardTitle>
          <div className="h-56 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#272c34" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#8b91a0" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: "#8b91a0" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "#8b91a0" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "#14171c",
                    border: "1px solid #272c34",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#8b91a0" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="taille"
                  name="Taille (cm)"
                  stroke="#5b8def"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="bras"
                  name="Bras (cm)"
                  stroke="#3fb37f"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mg"
                  name="% MG"
                  stroke="#e0a64a"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Form nouvelle mesure */}
      <Card>
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <CardTitle>Nouvelle mesure</CardTitle>
          {preview != null && (
            <Badge tone="accent">% MG calculé Navy : {preview.toFixed(1)} %</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FIELDS.map(({ key, label, placeholder, min, max }) => (
            <Field key={String(key)} label={label}>
              <input
                type="number"
                step={0.1}
                min={min}
                max={max}
                value={form[key as string] ?? ""}
                onChange={(e) =>
                  setForm({ ...form, [key as string]: e.target.value })
                }
                placeholder={placeholder}
              />
            </Field>
          ))}
        </div>
        <div className="mt-3">
          <Field label="Notes" hint="contexte (cycle, après cardio, hydratation…)">
            <input
              type="text"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="optionnel"
            />
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? "Sauvegarde…" : "Enregistrer la mesure"}
          </Button>
          {msg && <span className="text-sm text-danger">{msg}</span>}
        </div>
        <p className="text-xs text-muted mt-3">
          💡 Pour la formule Navy : tour de taille (au nombril, fin d'expiration) + tour de cou
          + tour de hanches (femmes uniquement). Précision ±3% vs DEXA.
        </p>
      </Card>

      {/* Historique */}
      {measurements.length > 0 && (
        <Card>
          <CardTitle>Historique</CardTitle>
          <div className="overflow-x-auto -mx-3 px-3">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-xs text-muted text-left border-b border-border">
                  <th className="font-normal py-2">Date</th>
                  <th className="font-normal py-2 text-right">Taille</th>
                  <th className="font-normal py-2 text-right">Hanches</th>
                  <th className="font-normal py-2 text-right">Cou</th>
                  <th className="font-normal py-2 text-right">Bras</th>
                  <th className="font-normal py-2 text-right">%MG</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => {
                  let bf: number | null = m.bodyFatPct;
                  let bfSource = "—";
                  if (m.bodyFatPct != null) bfSource = "manuel";
                  else if (profile && m.waistCm && m.neckCm) {
                    bf = navyBodyFat({
                      sex: profile.sex,
                      heightCm: profile.heightCm,
                      waistCm: m.waistCm,
                      neckCm: m.neckCm,
                      hipCm: m.hipCm ?? undefined,
                    });
                    if (bf != null) bfSource = "Navy";
                  }
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="py-1.5">{formatDate(m.date)}</td>
                      <td className="text-right tabular-nums">{m.waistCm?.toFixed(1) ?? "–"}</td>
                      <td className="text-right tabular-nums">{m.hipCm?.toFixed(1) ?? "–"}</td>
                      <td className="text-right tabular-nums">{m.neckCm?.toFixed(1) ?? "–"}</td>
                      <td className="text-right tabular-nums">{m.armCm?.toFixed(1) ?? "–"}</td>
                      <td className="text-right tabular-nums">
                        {bf != null ? `${bf.toFixed(1)} %` : "–"}
                        {bf != null && (
                          <span className="text-[9px] text-muted ml-1">{bfSource}</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => del(m.id)}
                          className="text-muted hover:text-danger text-xs"
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
