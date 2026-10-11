import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Motion/Reveal";
import { BrandPackages, CommissionNote, CreatorPackages, PackageTrustBar } from "@/components/Pricing/PackageCards";

/**
 * Ana sayfadaki üyelik paketleri bölümü.
 *
 * Kart içerikleri /fiyatlandirma sayfasıyla ortak bileşenlerden gelir
 * (components/Pricing/PackageCards.tsx) — iki yüzeyde farklı fiyat gösterme
 * ihtimali böylece ortadan kalkar.
 *
 * Fiyat listesi her zaman görünür: hafta sonu ücretsiz kuralı kampanya
 * bütçeleri ve ödeme uçları içindir, üyelik paketi fiyat listesi için değil.
 */
export function Pricing() {
  return (
    <section id="pricing" className="border-y border-border/60 bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Fiyatlandırma</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Creator&apos;lar ve markalar için üyelik paketleri
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Creator&apos;lar kampanyalara başvurmak, markalar doğru creator&apos;lara ulaşmak için ihtiyacına uyan
            paketi seçer.
          </p>
        </Reveal>

        <div className="mt-12">
          <Reveal className="mb-6 flex flex-col gap-1">
            <h3 className="text-xl font-semibold tracking-tight">Creator paketleri</h3>
            <p className="text-sm text-muted-foreground">Kampanyalara katıl, markalarla çalış, gelirini artır.</p>
          </Reveal>
          <CreatorPackages />
        </div>

        <div className="mt-14">
          <Reveal className="mb-6 flex flex-col gap-1">
            <h3 className="text-xl font-semibold tracking-tight">Marka paketleri</h3>
            <p className="text-sm text-muted-foreground">
              Doğru creator&apos;larla çalış, markanı büyüt, satışlarını artır.
            </p>
          </Reveal>
          <BrandPackages />
        </div>

        <Reveal variant="fade" className="mt-10">
          <CommissionNote />
        </Reveal>

        <Reveal variant="fade" className="mt-6">
          <PackageTrustBar />
        </Reveal>

        <Reveal variant="fade" className="mt-10 text-center">
          <Button variant="outline" className="rounded-full" asChild>
            <Link href="/fiyatlandirma">
              Tüm paketleri karşılaştır <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
