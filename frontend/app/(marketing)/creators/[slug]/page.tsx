import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Globe2,
  Heart,
  MapPin,
  Star,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { ContactCreatorDialog } from "@/features/creators/contact-creator-dialog";
import { CreatorCard } from "@/components/Cards/CreatorCard";
import { ReportDialog } from "@/components/shared/report-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { getCreator, listCreators } from "@/lib/api/creators";
import { listReviewsForReviewee } from "@/lib/api/reviews";
import { PLATFORM_LABEL, CATEGORY_LABEL_TR } from "@/lib/constants";
import { formatCompactNumber, formatCurrency, formatDate, formatPercent } from "@/lib/format";

// No generateStaticParams: creator profiles are live marketplace data,
// rendered on demand at request time instead of enumerated from the backend
// at build time (see the brands/[slug] page for the same reasoning).

export default async function CreatorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) notFound();

  const allCreators = await listCreators();
  const similar = allCreators.filter((c) => c.id !== creator.id && c.categories.some((cat) => creator.categories.includes(cat))).slice(0, 4);
  // Reviews live in a separate `apps/reviews` app on the backend, not nested under
  // Creator — fetched separately and merged in here for the reviews tab.
  const reviews = creator.userId ? await listReviewsForReviewee(creator.userId) : [];

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden bg-muted sm:h-72">
        {creator.coverUrl && <Image src={creator.coverUrl} alt={creator.name} fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-16 flex flex-col gap-6 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-28 w-28 border-4 border-background shadow-lg sm:h-32 sm:w-32">
              <AvatarImage src={creator.avatarUrl || undefined} alt={creator.name} />
              <AvatarFallback>{creator.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{creator.name}</h1>
                {creator.verified && <BadgeCheck className="h-6 w-6 fill-violet-600 text-white" />}
              </div>
              {creator.username && <p className="text-muted-foreground">@{creator.username}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {(creator.city ?? creator.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {creator.city ?? creator.country}
                  </span>
                )}
                {creator.rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {creator.rating}
                    {creator.reviewCount != null && ` (${creator.reviewCount} değerlendirme)`}
                  </span>
                )}
                {creator.responseTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Yanıt süresi: {creator.responseTime.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <ReportDialog targetType="creator" targetId={creator.id} targetLabel="Bu profili" />
            <ContactCreatorDialog creatorName={creator.name} packages={creator.packages ?? []} />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold">Hakkında</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">{creator.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {creator.categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="rounded-full font-normal">
                    {CATEGORY_LABEL_TR[cat]}
                  </Badge>
                ))}
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-lg font-semibold">Sosyal medya istatistikleri</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {creator.socials.map((s) => (
                  <Card key={s.platform} className="rounded-2xl border-border/70 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                          <PlatformIcon platform={s.platform} className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{PLATFORM_LABEL[s.platform]}</p>
                          <p className="text-xs text-muted-foreground">{s.handle}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full font-normal">
                        {formatPercent(s.engagementRate)} etkileşim
                      </Badge>
                    </div>
                    <p className="mt-3 text-2xl font-semibold">{formatCompactNumber(s.followers)}</p>
                    <p className="text-xs text-muted-foreground">takipçi</p>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            <Tabs defaultValue="portfolio">
              <TabsList>
                <TabsTrigger value="portfolio">Portfolyo</TabsTrigger>
                <TabsTrigger value="collabs">İş Birlikleri</TabsTrigger>
                <TabsTrigger value="reviews">Değerlendirmeler {reviews.length > 0 && `(${reviews.length})`}</TabsTrigger>
                {creator.packages && creator.packages.length > 0 && <TabsTrigger value="packages">Paketler</TabsTrigger>}
              </TabsList>

              <TabsContent value="portfolio" className="mt-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {creator.portfolio.map((item) => (
                    <div key={item.id} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                      {item.imageUrl && (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          sizes="(min-width: 640px) 30vw, 45vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      )}
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        {(item.likes != null || item.views != null) && (
                          <div className="mt-1 flex items-center gap-3 text-xs text-white/80">
                            {item.likes != null && (
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" /> {formatCompactNumber(item.likes)}
                              </span>
                            )}
                            {item.views != null && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {formatCompactNumber(item.views)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="collabs" className="mt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {creator.portfolio.slice(0, 4).map((item) => (
                    <Card key={item.id} className="flex items-center gap-4 rounded-2xl border-border/70 p-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {item.imageUrl && <Image src={item.imageUrl} alt={item.brand ?? ""} fill sizes="64px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        {item.brand && <p className="truncate font-medium">{item.brand}</p>}
                        <p className="truncate text-sm text-muted-foreground">{item.title}</p>
                      </div>
                      <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-500" />
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6 space-y-4">
                {reviews.length === 0 ? (
                  <EmptyState icon={Star} title="Henüz değerlendirme yok" description="Tamamlanan iş birliklerinden sonra değerlendirmeler burada görünecek." />
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id} className="rounded-2xl border-border/70 p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.authorAvatar} alt={review.authorName} />
                          <AvatarFallback>{review.authorName.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{review.authorName}</p>
                            <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                          </div>
                          {review.campaignTitle && <p className="text-xs text-muted-foreground">{review.campaignTitle}</p>}
                          <div className="mt-1 flex gap-0.5">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="packages" className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {(creator.packages ?? []).map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`relative flex flex-col rounded-2xl p-5 ${pkg.popular ? "border-violet-600 shadow-lg shadow-violet-600/10" : "border-border/70"}`}
                  >
                    {pkg.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-none bg-gradient-brand text-white">En popüler</Badge>
                    )}
                    <p className="font-semibold">{pkg.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p>
                    <p className="mt-4 text-2xl font-semibold">{formatCurrency(pkg.price)}</p>
                    <ul className="mt-4 flex-1 space-y-2">
                      {pkg.deliverables.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> {d}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">{pkg.turnaroundDays} günde teslim</p>
                    <ContactCreatorDialog
                      creatorName={creator.name}
                      packages={[pkg]}
                      trigger={
                        <Button variant="outline" className="mt-4 rounded-full">
                          Paketi seç
                        </Button>
                      }
                    />
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
            <Card className="rounded-2xl border-border/70 p-5">
              {creator.startingPrice != null && (
                <>
                  <p className="text-sm text-muted-foreground">Başlangıç fiyatı</p>
                  <p className="text-3xl font-semibold">{formatCurrency(creator.startingPrice)}</p>
                  <Separator className="my-4" />
                </>
              )}
              <dl className="space-y-3 text-sm">
                {creator.completedCollabs != null && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" /> Tamamlanan iş birlikleri
                    </dt>
                    <dd className="font-medium">{creator.completedCollabs}</dd>
                  </div>
                )}
                {creator.languages && creator.languages.length > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Globe2 className="h-4 w-4" /> Diller
                    </dt>
                    <dd className="font-medium">{creator.languages.join(", ")}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Katılım
                  </dt>
                  <dd className="font-medium">{formatDate(creator.joinedAt)}</dd>
                </div>
              </dl>
              <ContactCreatorDialog creatorName={creator.name} packages={creator.packages ?? []} trigger={
                <Button size="lg" className="mt-5 w-full gap-2 rounded-full bg-gradient-brand shadow-sm shadow-violet-600/30 hover:opacity-90 sm:hidden">
                  {creator.name.split(" ")[0]} ile iletişime geç
                </Button>
              } />
              <div className="mt-5 hidden sm:block">
                <ContactCreatorDialog creatorName={creator.name} packages={creator.packages ?? []} />
              </div>
            </Card>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-16 border-t border-border/60 pt-10">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Benzer creator&apos;lar</h2>
              <Link href="/creators" className="text-sm font-medium text-violet-600 hover:underline">
                Tümünü gör
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((c) => (
                <CreatorCard key={c.id} creator={c} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="h-16" />
    </div>
  );
}
