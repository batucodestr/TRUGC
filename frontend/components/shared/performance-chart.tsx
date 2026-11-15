"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface PerformancePoint {
  label: string;
  value: number;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** Mor çizgili, altı mor gradient dolgulu yumuşak alan grafiği; beyaz noktalı veri noktaları + tooltip kartı. */
export function PerformanceChart({ data, unit = "Erişim" }: { data: PerformancePoint[]; unit?: string }) {
  return (
    <div className="h-64 w-full" role="img" aria-label={`${unit} grafiği`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#a9a6c2", fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#a9a6c2", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={compact} width={52} />
          <Tooltip
            cursor={{ stroke: "rgba(168,85,247,0.4)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg border border-brand-light/40 bg-[#1d1738] px-3 py-1.5 text-center shadow-lg">
                  <p className="text-sm font-extrabold text-white">{compact(Number(payload[0].value))}</p>
                  <p className="text-xs text-text-soft">{unit}</p>
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#a855f7"
            strokeWidth={2.5}
            fill="url(#perfFill)"
            dot={{ r: 3, fill: "#fff", stroke: "#a855f7", strokeWidth: 1 }}
            activeDot={{ r: 5, fill: "#fff", stroke: "#a855f7" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
