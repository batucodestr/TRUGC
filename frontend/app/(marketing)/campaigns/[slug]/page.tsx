import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CampaignStatusBadge } from "@/features/campaigns/campaign-status-badge";
import { ApplyCampaignDialog } from "@/features/campaigns/apply-campaign-dialog";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { ReportDialog } from "@/components/shared/report-dialog";
import { getCampaign } from "@/lib/api/campaigns";
import { PLATFORM_LABEL } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";

// No generateStaticParams: campaigns are live marketplace data, rendered on
// demand at request time instead of enumerated from the backend at build
// time (see the brands/[slug] page for the same reasoning).

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) notFound();

  return (
    <div>
      <div className="relative h-64 w-full overflow-hidden bg-muted sm:h-80">
        {campaign.coverUrl ? (
          <Image src={campaign.coverUrl} alt={campaign.title} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-brand" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <CampaignStatusBadge status={campaign.status} className="mb-3" />
          <div className="flex items-center gap-2">
            {campaign.brandLogoUrl && (
              <Image src={campaign.brandLogoUrl} alt={campaign.brandName} width={28} height={28} className="h-7 w-7 rounded-lg object-cover" />
            )}
            <span className="text-sm font-medium text-white/90">{campaign.brandName}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{campaign.title}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold">Kampanya hakkında</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{campaign.description}</p>
            </section>

            <Separator />

            {campaign.requirements && (
              <>
                <section>
                  <h2 className="text-lg font-semibold">Gereksinimler</h2>
                  <ul className="mt-4 space-y-2.5">
                    {campaign.requirements
                      .split("\n")
                      .map((r) => r.trim())
                      .filter(Boolean)
                      .map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> {r}
                        </li>
                      ))}
                  </ul>
                </section>
                <Separator />
              </>
            )}

            {campaign.deliverables.length > 0 && (
              <>
                <section>
                  <h2 className="text-lg font-semibold">Teslimatlar</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {campaign.deliverables.map((d, i) => (
                      <Card key={d.id ?? i} className="flex items-center gap-3 rounded-2xl border-border/70 p-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                          {d.platform && <PlatformIcon platform={d.platform} className="h-4.5 w-4.5" />}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {d.quantity}x {d.description}
                          </p>
                          {d.platform && <p className="text-xs text-muted-foreground">{PLATFORM_LABEL[d.platform]}</p>}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
                <Separator />
              </>
            )}

            <section>
              <h2 className="text-lg font-semibold">Zaman çizelgesi</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card className="rounded-2xl border-border/70 p-4">
                  <p className="text-xs text-muted-foreground">Başvuru son tarihi</p>
                  <p className="mt-1 font-medium">{formatDate(campaign.applicationDeadline)}</p>
                </Card>
                <Card className="rounded-2xl border-border/70 p-4">
                  <p className="text-xs text-muted-foreground">Kampanya başlangıcı</p>
                  <p className="mt-1 font-medium">{campaign.startDate ? formatDate(campaign.startDate) : "—"}</p>
                </Card>
                <Card className="rounded-2xl border-border/70 p-4">
                  <p className="text-xs text-muted-foreground">Kampanya bitişi</p>
                  <p className="mt-1 font-medium">{campaign.endDate ? formatDate(campaign.endDate) : "—"}</p>
                </Card>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
            <Card className="rounded-2xl border-border/70 p-5">
              <p className="text-sm text-muted-foreground">Bütçe aralığı</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(campaign.budgetMin)} – {formatCurrency(campaign.budgetMax)}
              </p>
              <Separator className="my-4" />
              <dl className="space-y-3 text-sm">
                {campaign.applicantsCount != null && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" /> Başvuru
                    </dt>
                    <dd className="font-medium">{campaign.applicantsCount}</dd>
                  </div>
                )}
                {campaign.spotsAvailable != null && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" /> Kalan kontenjan
                    </dt>
                    <dd className="font-medium">{campaign.spotsAvailable}</dd>
                  </div>
                )}
                {campaign.location && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> Konum
                    </dt>
                    <dd className="font-medium">{campaign.location}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" /> Son tarih
                  </dt>
                  <dd className="font-medium">{formatDate(campaign.applicationDeadline)}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {campaign.platforms.map((p) => (
                  <Badge key={p} variant="secondary" className="gap-1 rounded-full font-normal">
                    <PlatformIcon platform={p} className="h-3 w-3" /> {PLATFORM_LABEL[p]}
                  </Badge>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2">
                <ApplyCampaignDialog campaignId={campaign.id} campaignTitle={campaign.title} />
              </div>
              <div className="mt-2 flex justify-end">
                <ReportDialog targetType="campaign" targetId={campaign.id} targetLabel="Bu kampanyayı" />
              </div>
            </Card>

            <Card className="flex items-center gap-3 rounded-2xl border-border/70 p-4">
              {campaign.brandLogoUrl && (
                <Image src={campaign.brandLogoUrl} alt={campaign.brandName} width={44} height={44} className="h-11 w-11 rounded-xl object-cover" />
              )}
              <div>
                <p className="flex items-center gap-1 text-sm font-medium">{campaign.brandName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" /> {formatDate(campaign.createdAt)} tarihinden beri üye
                </p>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
