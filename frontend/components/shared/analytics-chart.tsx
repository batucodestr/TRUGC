"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ChartPoint } from "@/types";

const chartConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function AnalyticsChart({ data, className }: { data: ChartPoint[]; className?: string }) {
  return (
    <ChartContainer config={chartConfig} className={className}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="value" type="monotone" fill="url(#fillValue)" stroke="var(--chart-1)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}
