import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, Briefcase, Calendar, Globe2, MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/features/campaigns/campaign-card";
import { getBrand } from "@/lib/api/brands";
import { listCampaigns } from "@/lib/api/campaigns";
import { formatCurrency, formatDate } from "@/lib/format";

// No generateStaticParams: brand profiles are live marketplace data (new
// brands register continuously), so every slug is rendered on demand at
// request time instead of being enumerated from the backend at build time
// (which would also make the Docker image build depend on a live backend).

export default async function BrandProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const allCampaigns = await listCampaigns();
  const campaigns = allCampaigns.filter((c) => c.brandId === brand.id);

  return (
    <div>
      <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-64">
        {brand.coverUrl && <Image src={brand.coverUrl} alt={brand.name} fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-14 flex flex-col gap-6 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            {brand.logoUrl && (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={104}
                height={104}
                className="h-24 w-24 rounded-2xl border-4 border-background bg-background object-cover shadow-lg sm:h-28 sm:w-28"
              />
            )}
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{brand.name}</h1>
                {brand.verified && <BadgeCheck className="h-6 w-6 fill-violet-600 text-white" />}
              </div>
              <p className="text-muted-foreground">{brand.industry}</p>
            </div>
          </div>
          {brand.website && (
            <Button variant="outline" className="rounded-full" asChild>
              <a href={brand.website} target="_blank" rel="noreferrer">
                <Globe2 className="h-4 w-4" /> Web sitesini ziyaret et
              </a>
            </Button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <p className="leading-relaxed text-muted-foreground">{brand.bio}</p>

            <Separator className="my-8" />

            <h2 className="text-lg font-semibold">Aktif kampanyalar</h2>
            {campaigns.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Şu anda görünür kampanya yok — yakında tekrar kontrol edin.</p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {campaigns.map((c) => (
                  <CampaignCard key={c.id} campaign={c} />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
            <Card className="rounded-2xl border-border/70 p-5">
              <dl className="space-y-3 text-sm">
                {brand.activeCampaigns != null && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" /> Aktif kampanyalar
                    </dt>
                    <dd className="font-medium">{brand.activeCampaigns}</dd>
                  </div>
                )}
                {brand.rating != null && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Star className="h-4 w-4" /> Puan
                    </dt>
                    <dd className="font-medium">
                      {brand.rating}
                      {brand.reviewCount != null && ` (${brand.reviewCount})`}
                    </dd>
                  </div>
                )}
                {brand.totalSpent != null && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Toplam harcama</dt>
                    <dd className="font-medium">{formatCurrency(brand.totalSpent, { compact: true })}</dd>
                  </div>
                )}
                {brand.country && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> Konum
                    </dt>
                    <dd className="font-medium">{brand.country}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Katılım
                  </dt>
                  <dd className="font-medium">{formatDate(brand.joinedAt)}</dd>
                </div>
              </dl>
            </Card>
          </aside>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}
