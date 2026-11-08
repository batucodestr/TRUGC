// Ücretli akışın üç adımı — kullanıcı nerede olduğunu ve ödemeden sonra ne
// açılacağını tek bakışta görsün diye ilan formunda, başvuru penceresinde ve
// ödeme ekranında aynı şerit gösterilir.
//
// Kural (bkz. backend/apps/payments/membership.py): kayıt ücretsiz; marka ilan
// yayınlarken, creator kampanyaya başvururken öder; mesajlaşma ödemeden sonra
// açılır.

import { Check, CreditCard, FileText, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Audience = "creator" | "brand";

const STEPS: Record<Audience, { label: string; short: string; hint: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  creator: [
    { label: "Başvur", short: "Başvur", hint: "Kampanyayı seç, mesajını yaz", icon: Send },
    { label: "Ödemeyi yap", short: "Öde", hint: "Paketini aktifleştir", icon: CreditCard },
    { label: "Mesajlaş", short: "Mesajlaş", hint: "Başvurun markaya iletilir", icon: MessageSquare },
  ],
  brand: [
    { label: "İlanı oluştur", short: "İlan", hint: "Kampanya detaylarını gir", icon: FileText },
    { label: "Ödemeyi yap", short: "Öde", hint: "Paketini aktifleştir", icon: CreditCard },
    { label: "Yayın & mesaj", short: "Yayın", hint: "İlan yayına girer, başvuranlarla yazış", icon: MessageSquare },
  ],
};

export function PaymentFlowSteps({
  audience,
  current,
  compact = false,
  className,
}: {
  audience: Audience;
  /** 0 tabanlı etkin adım; öncekiler tamamlanmış sayılır. */
  current: number;
  /** Dar alanlar (ör. başvuru penceresi) için: açıklama satırı gizlenir,
   *  ikon ve başlık yan yana tek satırda durur. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <ol className={cn("grid grid-cols-3 gap-2", className)} aria-label="Ödeme adımları">
      {STEPS[audience].map((step, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = done ? Check : step.icon;
        return (
          <li
            key={step.label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "relative flex rounded-2xl border transition-colors",
              compact
                ? "items-center gap-2 px-2.5 py-2"
                : "flex-col items-center gap-1.5 px-2 py-3 text-center sm:flex-row sm:items-start sm:gap-3 sm:px-3.5 sm:text-left",
              active && "border-violet-600/50 bg-violet-50 shadow-sm dark:bg-violet-500/15",
              done && "border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10",
              !active && !done && "border-border/60 bg-muted/30",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                compact ? "size-6" : "size-8",
                active && "bg-gradient-brand text-white",
                done && "bg-emerald-600 text-white",
                !active && !done && "bg-background text-muted-foreground ring-1 ring-border",
              )}
            >
              <Icon className={compact ? "size-3.5" : "size-4"} />
            </span>
            <span className="min-w-0">
              <span className={cn("block font-semibold leading-tight", compact ? "text-xs" : "text-xs sm:text-sm")}>
                {!compact && <span className="hidden text-muted-foreground sm:inline">{i + 1}. </span>}
                {compact ? step.short : step.label}
              </span>
              {!compact && (
                <span className="hidden text-xs leading-snug text-muted-foreground sm:block">{step.hint}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
