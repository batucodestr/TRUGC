"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from "recharts";

/** Aylara göre giderek yükselen mor gradient bar grafik (Kazançlarım kartı). */
export function EarningsBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="h-36 w-full" role="img" aria-label="Aylık kazanç grafiği">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c026d3" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fill: "#a9a6c2", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} minPointSize={6}>
            {data.map((d, i) => (
              <Cell key={i} fill="url(#barFill)" fillOpacity={0.45 + 0.55 * (d.value / max)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
