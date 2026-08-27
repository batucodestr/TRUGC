import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/types";

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  published: { label: "Aktif", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  draft: { label: "Taslak", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "Devam ediyor", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  completed: { label: "Tamamlandı", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  cancelled: { label: "İptal edildi", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" },
};

export function CampaignStatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={cn("border-none font-medium", config.className, className)}>{config.label}</Badge>;
}
