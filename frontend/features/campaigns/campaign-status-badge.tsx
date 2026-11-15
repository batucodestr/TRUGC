import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/types";

// Tasarım paleti: Aktif → yeşil, Devam Ediyor → mavi, Tamamlandı → nötr.
const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  published: { label: "Aktif", className: "bg-success/15 text-success" },
  draft: { label: "Taslak", className: "bg-white/10 text-[#d4d2e3]" },
  in_review: { label: "İncelemede", className: "bg-crown/15 text-crown" },
  in_progress: { label: "Devam Ediyor", className: "bg-info/20 text-[#7db5ff]" },
  completed: { label: "Tamamlandı", className: "bg-white/10 text-[#d4d2e3]" },
  cancelled: { label: "İptal edildi", className: "bg-red-500/15 text-red-400" },
};

/** Paketsiz markanın ilanı: taslakta bekler, ödeme onaylanınca yayına girer. */
const AWAITING_PAYMENT = {
  label: "Ödeme bekliyor",
  className: "bg-brand/25 text-violet-300",
};

export function CampaignStatusBadge({
  status,
  awaitingPayment,
  className,
}: {
  status: CampaignStatus;
  awaitingPayment?: boolean;
  className?: string;
}) {
  const config = awaitingPayment && status === "draft" ? AWAITING_PAYMENT : STATUS_CONFIG[status];
  return <Badge className={cn("border-none font-medium", config.className, className)}>{config.label}</Badge>;
}
