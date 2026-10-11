// Üyelik paketi kartları — ana sayfadaki fiyat bölümü ve /fiyatlandirma
// sayfası aynı bileşenleri kullanır, böylece iki yüzey birbirinden ayrışamaz.
//
// Paket fiyatları HER ZAMAN gösterilir; hafta sonu ücretsiz kuralına
// (lib/pricing.ts) bağlı değildir. O kural kampanya bütçeleri ve ödeme
// uçları içindir — üyelik paketi bundan ayrı bir üründür ve fiyat listesinin
// hafta sonu "Ücretsiz"e dönmesi fiyat listesini okunamaz hale getiriyordu.

import {
  BarChart3,
  Check,
  Crown,
  Gem,
  Headphones,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Target,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PackageCheckoutDialog } from "@/components/Pricing/PackageCheckoutDialog";
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
export function CreatorPackages() {
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
                      <p className="text-xl font-semibold tracking-tight">{formatTryPrice(tier.price)}</p>
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
              <p className="mt-3 text-xs text-muted-foreground">KDV dahil, Türk Lirası (TL)</p>

              <FeatureList features={pkg.features} />

              <PackageCheckoutDialog
                packageName={pkg.name}
                dashboardHref="/dashboard/creator"
                triggerVariant={pkg.highlighted ? "default" : "outline"}
                triggerClassName={cn("mt-7 w-full", pkg.highlighted && "bg-gradient-brand hover:opacity-90")}
                options={pkg.tiers.map((tier) => ({
                  id: tier.id,
                  label: tier.label,
                  price: tier.price,
                  note: `${tier.applications} iş başvuru hakkı`,
                }))}
              />
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

/** Marka üyelik paketleri — aylık sabit ücret. */
export function BrandPackages() {
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
                <span className="text-4xl font-semibold tracking-tight">{formatTryPrice(pkg.price)}</span>
                <span className="text-sm text-muted-foreground">/ay</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">KDV dahil, Türk Lirası (TL)</p>

              <FeatureList features={pkg.features} />

              <PackageCheckoutDialog
                packageName={pkg.name}
                dashboardHref="/dashboard/brand"
                triggerVariant={pkg.highlighted ? "default" : "outline"}
                triggerClassName={cn("mt-7 w-full", pkg.highlighted && "bg-gradient-brand hover:opacity-90")}
                options={[{ id: `${pkg.id}-monthly`, label: "Aylık", price: pkg.price }]}
              />
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
 * bütçesi üzerinden komisyon eklenir.
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

/**
 * Paketlerin altındaki güven bandı (referans tasarımdaki alt şerit).
 *
 * "7/24 Destek" yerine çağrı destek hattı yazar: destek saatleri sitenin
 * başka yerlerinde (lib/company.ts → supportHours, iletişim sayfası) hafta
 * içi 09:00-19:00 olarak duyuruluyor, 7/24 iddiası bununla çelişirdi.
 */
const TRUST_ITEMS = [
  { Icon: ShieldCheck, label: "Güvenli Ödeme Sistemi" },
  { Icon: Headphones, label: "Çağrı Destek Hattı" },
  { Icon: BarChart3, label: "Ölçülebilir Sonuçlar" },
  { Icon: Users, label: "Kaliteli Creator'lar" },
  { Icon: Target, label: "Doğru Hedefleme" },
  { Icon: Rocket, label: "Markanızı Büyütün" },
];

export function PackageTrustBar({ className }: { className?: string }) {
  return (
    <Card className={cn("rounded-3xl border-border/70 px-6 py-7 shadow-sm", className)}>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
        {TRUST_ITEMS.map(({ Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-2.5 text-center">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-medium leading-snug">{label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
