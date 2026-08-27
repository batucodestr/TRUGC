import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Briefcase, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Brand } from "@/types";

export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link href={`/brands/${brand.slug}`} className="group block">
      <Card className="overflow-hidden rounded-3xl border-border/70 p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-600/10">
        <div className="relative h-24 w-full overflow-hidden bg-muted">
          {brand.coverUrl && (
            <Image
              src={brand.coverUrl}
              alt={brand.name}
              fill
              sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 45vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
        </div>
        <div className="-mt-8 flex flex-col items-center px-5 pb-5 text-center">
          {brand.logoUrl && (
            <Image
              src={brand.logoUrl}
              alt={brand.name}
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl border-4 border-background bg-background object-cover shadow-sm"
            />
          )}
          <p className="mt-2 flex items-center gap-1 font-semibold">
            {brand.name}
            {brand.verified && <BadgeCheck className="h-4 w-4 fill-violet-500 text-white" />}
          </p>
          <p className="text-xs text-muted-foreground">{brand.industry}</p>

          {(brand.activeCampaigns != null || brand.rating != null || brand.totalSpent != null) && (
            <div className="mt-4 flex w-full items-center justify-around border-t border-border/70 pt-3 text-xs text-muted-foreground">
              {brand.activeCampaigns != null && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Briefcase className="h-3.5 w-3.5" /> {brand.activeCampaigns}
                  </span>
                  Active
                </div>
              )}
              {brand.rating != null && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {brand.rating}
                  </span>
                  Rating
                </div>
              )}
              {brand.totalSpent != null && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-medium text-foreground">{formatCurrency(brand.totalSpent, { compact: true })}</span>
                  Spent
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
