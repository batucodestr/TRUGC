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

const STEPS: Record<Audience, { label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  creator: [
    { label: "Başvur", hint: "Kampanyayı seç, mesajını yaz", icon: Send },
    { label: "Ödemeyi yap", hint: "Paketini aktifleştir", icon: CreditCard },
    { label: "Mesajlaş", hint: "Başvurun markaya iletilir", icon: MessageSquare },
  ],
  brand: [
    { label: "İlanı oluştur", hint: "Kampanya detaylarını gir", icon: FileText },
    { label: "Ödemeyi yap", hint: "Paketini aktifleştir", icon: CreditCard },
    { label: "Yayın & mesaj", hint: "İlan yayına girer, başvuranlarla yazış", icon: MessageSquare },
  ],
};

export function PaymentFlowSteps({
  audience,
  current,
  className,
}: {
  audience: Audience;
  /** 0 tabanlı etkin adım; öncekiler tamamlanmış sayılır. */
  current: number;
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
              "relative flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-colors sm:flex-row sm:items-start sm:gap-3 sm:px-3.5 sm:text-left",
              active && "border-violet-600/50 bg-violet-50 shadow-sm dark:bg-violet-500/15",
              done && "border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10",
              !active && !done && "border-border/60 bg-muted/30",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                active && "bg-gradient-brand text-white",
                done && "bg-emerald-600 text-white",
                !active && !done && "bg-background text-muted-foreground ring-1 ring-border",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold sm:text-sm">
                <span className="hidden text-muted-foreground sm:inline">{i + 1}. </span>
                {step.label}
              </span>
              <span className="hidden text-xs leading-snug text-muted-foreground sm:block">{step.hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
