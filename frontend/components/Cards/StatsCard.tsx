import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/shared/count-up";
import { IconBox } from "@/components/shared/icon-box";
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
  // tr-TR: "5.000" = beş bin (nokta binlik ayracı), "1,5" = ondalık; "1.2" (tek haneli) ondalıktır.
  const normalized = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(numStr)
    ? numStr.replace(/\./g, "").replace(",", ".")
    : numStr.replace(/,/g, "");
  const number = Number(normalized);
  if (Number.isNaN(number)) return null;
  return { prefix, number, suffix };
}

export function StatsCard({ label, value, icon: Icon, trend, className }: StatsCardProps) {
  const countable = parseCountable(value);

  return (
    <StatsCardMotion>
      <Card className={cn("glow-hover rounded-2xl border-border", className)}>
        <CardContent className="flex items-center gap-4 px-5 py-1">
          {Icon && <IconBox icon={Icon} />}
          <div className="min-w-0 space-y-1">
            <p className="truncate text-[15px] text-white/90">{label}</p>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <p className="text-3xl font-extrabold tracking-tight text-white">
                {countable ? <CountUp value={countable.number} prefix={countable.prefix} suffix={countable.suffix} /> : value}
              </p>
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
                    trend.positive ? "bg-success/15 text-success" : "bg-red-500/15 text-red-400",
                  )}
                >
                  {trend.positive ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
                  {trend.value}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </StatsCardMotion>
  );
}
