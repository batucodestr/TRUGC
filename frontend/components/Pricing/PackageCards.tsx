// Üyelik paketi kartları — ana sayfadaki fiyat bölümü ve /fiyatlandirma
// sayfası aynı bileşenleri kullanır, böylece iki yüzey birbirinden ayrışamaz.
//
// Bileşenler fiyat durumunu kendileri okumaz: `showPrices` çağıran sunucu
// bileşeninden gelir (bkz. lib/pricing.ts). Ücretsiz dönemde hiçbir tutar
// basılmaz — paket içerikleri yine görünür.

import Link from "next/link";
import { Check, Crown, Gem, Send, Sparkles, Sprout, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/Motion/Reveal";
import {
  BRAND_PACKAGES,
  CAMPAIGN_COMMISSION_PERCENT,
  COMMISSION_EXAMPLE_BUDGET,
  CREATOR_PACKAGES,
} from "@/lib/content/packages";
import { formatTryPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const CREATOR_ICONS: Record<string, typeof Send> = {
  "classic-creator": Send,
  "premium-creator": Crown,
};

const BRAND_ICONS: Record<string, typeof Sprout> = {
  "baslangic-marka": Sprout,
  "profesyonel-marka": Star,
  "kurumsal-marka": Gem,
};

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="mt-6 flex-1 space-y-2.5">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-sm">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-600/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
            <Check className="size-3" />
          </span>
          <span className="text-muted-foreground">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

/** Creator üyelik paketleri — her kart 3 Günlük / Haftalık / Aylık satırını taşır. */
export function CreatorPackages({ showPrices }: { showPrices: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {CREATOR_PACKAGES.map((pkg, i) => {
        const Icon = CREATOR_ICONS[pkg.id] ?? Send;
        return (
          <Reveal key={pkg.id} variant="scale" delay={i * 0.08} className="h-full">
            <Card
              className={cn(
                "flex h-full flex-col rounded-3xl border-border/70 p-7 shadow-sm",
                pkg.highlighted && "border-violet-600/60 shadow-xl shadow-violet-600/10",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/25">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold leading-tight">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">{pkg.tagline}</p>
                </div>
              </div>

              <ul className="mt-6 space-y-2.5">
                {pkg.tiers.map((tier) => (
                  <li
                    key={tier.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-violet-600 dark:text-violet-300">
                        {tier.label}
                      </p>
                      <p className="text-xl font-semibold tracking-tight">
                        {showPrices ? formatTryPrice(tier.price) : "Ücretsiz"}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{tier.applications}</span> iş
                      <br />
                      başvuru hakkı
                    </p>
                  </li>
                ))}
              </ul>

              {/* iyzico şartı: fiyatlar TL cinsinden ve KDV dahil gösterilmeli. */}
              {showPrices && <p className="mt-3 text-xs text-muted-foreground">KDV dahil, Türk Lirası (TL)</p>}

              <FeatureList features={pkg.features} />

              <Button
                className={cn("mt-7 rounded-full", pkg.highlighted && "bg-gradient-brand hover:opacity-90")}
                variant={pkg.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href="/dashboard/creator">Paketi seç</Link>
              </Button>
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

/** Marka üyelik paketleri — aylık sabit ücret. */
export function BrandPackages({ showPrices }: { showPrices: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {BRAND_PACKAGES.map((pkg, i) => {
        const Icon = BRAND_ICONS[pkg.id] ?? Sprout;
        return (
          <Reveal
            key={pkg.id}
            variant="scale"
            delay={i * 0.08}
            className={cn("relative h-full", pkg.highlighted && "md:-translate-y-3")}
          >
            {pkg.badge && (
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-brand px-3 py-1 text-xs font-medium text-white shadow">
                {pkg.badge}
              </span>
            )}
            <Card
              className={cn(
                "flex h-full flex-col rounded-3xl border-border/70 p-7 shadow-sm",
                pkg.highlighted && "border-violet-600 shadow-xl shadow-violet-600/15",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/25">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{pkg.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{pkg.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">
                  {showPrices ? formatTryPrice(pkg.price) : "Ücretsiz"}
                </span>
                {showPrices && <span className="text-sm text-muted-foreground">/ay</span>}
              </div>
              {showPrices && <p className="mt-1 text-xs text-muted-foreground">KDV dahil, Türk Lirası (TL)</p>}

              <FeatureList features={pkg.features} />

              <Button
                className={cn("mt-7 rounded-full", pkg.highlighted && "bg-gradient-brand hover:opacity-90")}
                variant={pkg.highlighted ? "default" : "outline"}
                asChild
              >
                <Link href="/dashboard/brand">Paketi seç</Link>
              </Button>
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

/**
 * Kampanya komisyonu notu.
 *
 * Üyelik ücretinden ayrı bir kalemdir: marka bir kampanya yayınladığında
 * bütçesi üzerinden komisyon eklenir. Ücretsiz dönemde komisyon sıfırdır
 * (bkz. apps/common/pricing.py: commission_percent), bu yüzden kutu yalnızca
 * fiyatların gösterildiği dönemde basılır.
 */
export function CommissionNote({ className }: { className?: string }) {
  const example = COMMISSION_EXAMPLE_BUDGET;
  const commission = (example * CAMPAIGN_COMMISSION_PERCENT) / 100;

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 rounded-3xl border-border/70 p-7 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/25">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold">Kampanya komisyonu</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Üyelik ücretine ek olarak, marka bir kampanya yayınladığında kampanya bütçesi üzerinden %
            {CAMPAIGN_COMMISSION_PERCENT} platform komisyonu alınır. Komisyon creator&apos;ın hak edişinden
            düşülmez; markanın bütçesine eklenir.
          </p>
        </div>
      </div>
      <div className="shrink-0 rounded-2xl border border-border/60 bg-muted/40 px-5 py-4 text-sm sm:text-right">
        <p className="text-xs text-muted-foreground">Örnek</p>
        <p className="mt-1 font-medium">
          {formatTryPrice(example)} bütçe → <span className="text-violet-600 dark:text-violet-300">+{formatTryPrice(commission)}</span> komisyon
        </p>
      </div>
    </Card>
  );
}
