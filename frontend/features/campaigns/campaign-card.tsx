import Link from "next/link";
import Image from "next/image";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_LABEL_TR } from "@/lib/constants";
import type { Campaign } from "@/types";
import type { CreatorCategory } from "@/types";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link href={`/campaigns/${campaign.slug}`} className="group block">
      <Card className="overflow-hidden rounded-3xl border-border/70 p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-600/10">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {campaign.coverUrl ? (
            <Image
              src={campaign.coverUrl}
              alt={campaign.title}
              fill
              sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 90vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-sm font-medium text-white/80">
              {campaign.brandName}
            </div>
          )}
          <div className="absolute left-3 top-3">
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <div className="absolute right-3 top-3 flex gap-1">
            {campaign.platforms.map((p) => (
              <span key={p} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow">
                <PlatformIcon platform={p} className="h-3.5 w-3.5" />
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            {campaign.brandLogoUrl && (
              <Image src={campaign.brandLogoUrl} alt={campaign.brandName} width={22} height={22} className="h-5.5 w-5.5 rounded-md object-cover" />
            )}
            <span className="text-xs font-medium text-muted-foreground">{campaign.brandName}</span>
          </div>
          <h3 className="line-clamp-1 text-base font-semibold leading-snug">{campaign.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{campaign.description}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
            {campaign.applicantsCount != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {campaign.applicantsCount} başvuru
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> Son tarih {formatDate(campaign.applicationDeadline)}
            </span>
            {campaign.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {campaign.location}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/70 pt-3">
            <Badge variant="secondary" className="rounded-full font-normal">
              {campaign.categories[0] ? (CATEGORY_LABEL_TR[campaign.categories[0] as CreatorCategory] ?? campaign.categories[0]) : "Genel"}
            </Badge>
            <span className="text-sm font-semibold">
              {formatCurrency(campaign.budgetMin, { compact: true })}–{formatCurrency(campaign.budgetMax, { compact: true })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
