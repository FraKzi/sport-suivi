"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function WeightChart({ data }: { data: { date: string; kg: number }[] }) {
  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    kg: d.kg,
  }));
  if (formatted.length === 0) return null;

  return (
    <div className="h-48 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <CartesianGrid stroke="#272c34" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#8b91a0" fontSize={11} />
          <YAxis stroke="#8b91a0" fontSize={11} domain={["dataMin - 1", "dataMax + 1"]} />
          <Tooltip
            contentStyle={{
              background: "#14171c",
              border: "1px solid #272c34",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(v: number) => [`${v} kg`, "Poids"]}
          />
          <Line type="monotone" dataKey="kg" stroke="#5b8def" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
