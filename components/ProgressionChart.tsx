"use client";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Serie = {
  exoId: number;
  name: string;
  points: { date: string; volume: number; weight: number; reps: number }[];
};

export function ProgressionChart({ series }: { series: Serie[] }) {
  const [exoId, setExoId] = useState<number | null>(series[0]?.exoId ?? null);
  const [metric, setMetric] = useState<"weight" | "volume">("weight");

  const current = series.find((s) => s.exoId === exoId) ?? series[0];
  const data = useMemo(() => {
    if (!current) return [];
    return current.points.map((p) => ({
      date: new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      value: metric === "weight" ? p.weight : p.volume,
    }));
  }, [current, metric]);

  if (!current) return <p className="text-sm text-muted">Pas encore de données.</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <select
          value={exoId ?? ""}
          onChange={(e) => setExoId(Number(e.target.value))}
          className="!w-auto"
        >
          {series.map((s) => (
            <option key={s.exoId} value={s.exoId}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="flex bg-surface2 rounded-md p-0.5 text-xs">
          <button
            onClick={() => setMetric("weight")}
            className={`px-2 py-1 rounded ${metric === "weight" ? "bg-accent text-white" : "text-muted"}`}
          >
            Charge
          </button>
          <button
            onClick={() => setMetric("volume")}
            className={`px-2 py-1 rounded ${metric === "volume" ? "bg-accent text-white" : "text-muted"}`}
          >
            Volume (kg×reps)
          </button>
        </div>
      </div>
      <div className="h-64 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#272c34" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#8b91a0" fontSize={11} />
            <YAxis stroke="#8b91a0" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "#14171c",
                border: "1px solid #272c34",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v: number) => [v, metric === "weight" ? "Charge max (kg)" : "Volume top set"]}
            />
            <Line type="monotone" dataKey="value" stroke="#5b8def" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
