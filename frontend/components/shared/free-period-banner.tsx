"use client";

import { PartyPopper } from "lucide-react";
import { usePricing } from "@/components/Pricing/PricingProvider";
import { formatFreePeriodWindow } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * "Hafta sonu ücretsiz" bilgilendirmesi. Yalnızca ücretsiz dönemde görünür ve
 * durumu sunucudan gelen ücretlendirme bilgisinden alır (bkz. PricingProvider).
 */
export function FreePeriodBanner({ className }: { className?: string }) {
  const { state, isFree, loading } = usePricing();

  if (loading || !isFree || !state) return null;

  const until = formatFreePeriodWindow(state);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:gap-3 dark:bg-emerald-500/10 dark:text-emerald-200",
        className,
      )}
      role="status"
    >
      <PartyPopper className="size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">Hafta sonu her şey ücretsiz</p>
        <p className="text-emerald-800/80 dark:text-emerald-200/80">
          {state.notice}
          {until ? ` Ücretsiz kullanım ${until} tarihine kadar sürüyor.` : ""}
        </p>
      </div>
    </div>
  );
}

/** Ücretli dönemde ödeme ekranlarında gösterilen kısa bilgi notu. */
export function PaidPeriodNotice({ className }: { className?: string }) {
  const { state, loading } = usePricing();

  if (loading || !state || state.free || !state.weekend_free_enabled) return null;

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Ücretlendirme hafta içi geçerlidir. {state.free_weekday_labels.join(" ve ")} günleri TRUGC ücretsizdir.
    </p>
  );
}
