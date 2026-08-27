import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BadgeCheck, MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { TiltCard } from "@/components/Motion/TiltCard";
import { formatCompactNumber, formatCurrency } from "@/lib/format";
import { CATEGORY_LABEL_TR, COUNTRY_LABEL_TR } from "@/lib/constants";
import type { Creator } from "@/types";

export function CreatorCard({ creator }: { creator: Creator }) {
  const topSocial = [...creator.socials].sort((a, b) => b.followers - a.followers)[0];
  const otherPlatforms = topSocial ? creator.socials.filter((s) => s.platform !== topSocial.platform) : [];

  return (
    <Link href={`/creators/${creator.slug}`} className="group relative block">
      {/* Shimmering gradient border ring — clipped to its own container so the
          rotating gradient's corners never sweep outside the card, and kept
          outside the 3D tilt so its spin never compounds with the perspective. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div
          className="absolute -inset-1/2 aspect-square"
          style={{
            background: "conic-gradient(from 0deg, rgba(124,58,237,0.9), rgba(217,70,239,0.6), transparent 40%, rgba(124,58,237,0.9))",
            animation: "shimmer-spin 3.5s linear infinite",
          }}
        />
      </div>

      <TiltCard className="relative rounded-3xl p-[1px]">
        <Card className="relative overflow-hidden rounded-[calc(1.5rem-1px)] border-border/70 p-0 shadow-sm transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-violet-600/20">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
            {creator.coverUrl && (
              <Image
                src={creator.coverUrl}
                alt={creator.name}
                fill
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 90vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />

            <div className="absolute left-3 top-3 flex gap-1.5">
              {creator.tier === "elite" && (
                <Badge className="border-none bg-gradient-brand text-white shadow">Elite</Badge>
              )}
              {creator.tier === "top" && <Badge className="border-none bg-black/70 text-white backdrop-blur">En çok tercih edilen</Badge>}
            </div>

            {otherPlatforms.length > 0 && (
              <div className="absolute right-3 top-3 flex -translate-y-1 gap-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                {otherPlatforms.map((s) => (
                  <span key={s.platform} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow">
                    <PlatformIcon platform={s.platform} className="h-3 w-3" />
                  </span>
                ))}
              </div>
            )}

            {/* View profile — fades and lifts in over the image, clear of the avatar row below */}
            <div className="absolute inset-x-0 top-0 flex h-[calc(100%-3.75rem)] translate-y-2 items-center justify-center opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
              <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-violet-700 shadow-lg">
                Profili görüntüle <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
              <div className="flex items-center gap-2">
                {creator.avatarUrl && (
                  <Image
                    src={creator.avatarUrl}
                    alt={creator.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-white/80 object-cover"
                  />
                )}
                <div>
                  <p className="flex items-center gap-1 text-sm font-semibold leading-tight">
                    {creator.name}
                    {creator.verified && <BadgeCheck className="h-3.5 w-3.5 fill-violet-500 text-white" />}
                  </p>
                  {(creator.city ?? creator.country) && (
                    <p className="flex items-center gap-1 text-xs text-white/80">
                      <MapPin className="h-3 w-3" />{" "}
                      {creator.city ?? (creator.country ? (COUNTRY_LABEL_TR[creator.country as keyof typeof COUNTRY_LABEL_TR] ?? creator.country) : "")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              {creator.categories.slice(0, 2).map((cat) => (
                <Badge key={cat} variant="secondary" className="rounded-full font-normal">
                  {CATEGORY_LABEL_TR[cat] ?? cat}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              {topSocial && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <PlatformIcon platform={topSocial.platform} className="h-4 w-4" />
                  <span className="font-medium text-foreground">{formatCompactNumber(topSocial.followers)}</span>
                  takipçi
                </div>
              )}
              {creator.rating != null && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground">{creator.rating}</span>
                  {creator.reviewCount != null && <span>({creator.reviewCount})</span>}
                </div>
              )}
            </div>

            {creator.startingPrice != null && (
              <div className="flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-xs text-muted-foreground">Başlangıç fiyatı</span>
                <span className="text-base font-semibold text-foreground">{formatCurrency(creator.startingPrice)}</span>
              </div>
            )}
          </div>
        </Card>
      </TiltCard>
    </Link>
  );
}
