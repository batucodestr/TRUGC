interface DistributionBarsProps {
  data: { label: string; value: number }[];
  colorClassName?: string;
}

export function DistributionBars({ data, colorClassName = "bg-violet-600" }: DistributionBarsProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{d.label}</span>
            <span className="text-muted-foreground">{d.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${colorClassName}`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
