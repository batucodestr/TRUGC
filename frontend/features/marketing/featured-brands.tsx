import { Building2 } from "lucide-react";
import { BrandCard } from "@/features/brands/brand-card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { listFeaturedBrands } from "@/lib/api/brands";

export async function FeaturedBrands() {
  const brands = await listFeaturedBrands(6);

  return (
    <section className="border-y border-border/60 bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Öne çıkan markalar</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">TRUGC ile büyüyen markalar</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Küçük D2C girişimlerinden global markalara kadar herkes, en uygun creator ortağını bulmak için TRUGC&apos;ye güveniyor.
          </p>
        </Reveal>

        {brands.length === 0 ? (
          <EmptyState icon={Building2} title="Henüz marka bulunmuyor" description="Yeni markalar katıldıkça burada listelenecek." className="mt-10" />
        ) : (
          <Reveal variant="stagger" staggerChildren={0.06} className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {brands.map((brand) => (
              <RevealItem key={brand.id}>
                <BrandCard brand={brand} />
              </RevealItem>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}
