import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/shared/count-up";
import { StatsCardMotion } from "./StatsCardMotion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

/** "₺482B" veya "2352" gibi bir görüntü değerini count-up parçalarına ayrıştırır; ayrıştıramazsa statik bir etikete geri döner. */
function parseCountable(value: string): { prefix: string; number: number; suffix: string } | null {
  const match = value.match(/^([^\d-]*)([\d,.]+)(.*)$/);
  if (!match) return null;
  const [, prefix, numStr, suffix] = match;
  const number = Number(numStr.replace(/,/g, ""));
  if (Number.isNaN(number)) return null;
  return { prefix, number, suffix };
}

export function StatsCard({ label, value, icon: Icon, trend, className }: StatsCardProps) {
  const countable = parseCountable(value);

  return (
    <StatsCardMotion>
      <Card
        className={cn(
          "rounded-2xl border-border/70 shadow-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-violet-600/10",
          className,
        )}
      >
        <CardContent className="flex items-start justify-between gap-4 px-5 py-5">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">
              {countable ? <CountUp value={countable.number} prefix={countable.prefix} suffix={countable.suffix} /> : value}
            </p>
            {trend && (
              <p className={cn("flex items-center gap-1 text-xs font-medium", trend.positive ? "text-emerald-600" : "text-rose-600")}>
                {trend.positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {trend.value}
              </p>
            )}
          </div>
          {Icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
              <Icon className="h-5 w-5" />
            </div>
          )}
        </CardContent>
      </Card>
    </StatsCardMotion>
  );
}
