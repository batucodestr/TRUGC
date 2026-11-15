import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, CalendarDays, Eye, FileText, CheckCircle2, Layers, Megaphone, Plus, Search, Users, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/Cards/StatsCard";
import { IconBox } from "@/components/shared/icon-box";
import { PerformanceChart } from "@/components/shared/performance-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { MembershipStatusCard } from "@/components/shared/membership-status-card";
import { CampaignStatusBadge } from "@/features/campaigns/campaign-status-badge";
import { listMyCampaigns } from "@/lib/api/campaigns";
import { listApplications } from "@/lib/api/applications";
import { getBrandDashboard } from "@/lib/api/analytics";
import { getMyBrandName } from "@/lib/api/me";
import { formatShortNumber } from "@/lib/format";

function trend(pct: number | null | undefined) {
  if (pct == null) return undefined;
  return { value: `${pct >= 0 ? "+" : ""}%${Math.abs(pct)}`, positive: pct >= 0 };
}

function dateRange(start?: string, end?: string) {
  const f = (iso?: string) => (iso ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(iso)) : "—");
  return `${f(start)} – ${f(end)}`;
}

export default async function BrandDashboardPage() {
  const [brandName, campaigns, applications, dashboard] = await Promise.all([
    getMyBrandName(),
    listMyCampaigns(),
    listApplications(),
    getBrandDashboard(),
  ]);
  const visibleApps = applications.filter((a) => !a.awaitingPayment);
  const pending = visibleApps.filter((a) => a.status === "pending").length;
  const recentApps = [...visibleApps].sort((a, b) => +new Date(b.appliedAt) - +new Date(a.appliedAt)).slice(0, 3);
  const chart = dashboard.reach_series.map((p) => ({
    label: new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(p.date)),
    value: p.reach,
  }));
  const hasReach = dashboard.reach_series.some((p) => p.reach > 0);

  return (
    <div className="space-y-6">
      {/* Karşılama */}
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute -inset-x-4 -top-8 h-64 bg-[radial-gradient(36rem_14rem_at_88%_30%,rgb(139_61_255/0.35),transparent_70%)]" />
        <div className="relative">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Tekrar hoş geldiniz, <span className="text-brand-light">{brandName}</span> 👋
          </h1>
          <p className="mt-2 text-text-soft">Marka kampanyalarınızı yönetin, creator&apos;larla iş birliği yapın ve sonuçları anlık takip edin.</p>
        </div>
      </div>

      <MembershipStatusCard audience="brand" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Aktif Kampanya" value={String(dashboard.active_campaigns)} icon={Megaphone}
          trend={dashboard.active_campaigns_delta > 0 ? { value: `+${dashboard.active_campaigns_delta}`, positive: true } : undefined} />
        <StatsCard label="Toplam Başvuru" value={String(dashboard.total_applicants)} icon={Users} trend={trend(dashboard.applicants_trend_pct)} />
        <StatsCard label="Kabul Edilen" value={String(dashboard.accepted_applicants)} icon={CheckCircle2} trend={trend(dashboard.accepted_trend_pct)} />
        <StatsCard label="Tahmini Erişim" value={formatShortNumber(dashboard.estimated_reach)} icon={Eye} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <div className="flex items-center justify-between px-5">
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-white">
              <BarChart3 className="h-6 w-6 text-brand-light" aria-hidden /> Kampanya Performansı
            </h2>
            <Badge variant="neutral" className="h-9 rounded-xl border border-border bg-white/[0.03] px-4 text-sm font-medium">Son 30 Gün</Badge>
          </div>
          <div className="px-3">
            {hasReach ? (
              <PerformanceChart data={chart} />
            ) : (
              <EmptyState title="Henüz erişim verisi yok" description="Creator'ları kabul ettikçe tahmini erişim grafiği oluşur." className="h-64" />
            )}
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2.5 px-5 text-xl font-bold text-white">
            <Zap className="h-6 w-6 text-brand-light" aria-hidden /> Hızlı İşlemler
          </h2>
          <div className="space-y-2.5 px-5">
            <Button size="lg" className="h-12 w-full" asChild>
              <Link href="/dashboard/brand/campaigns/new"><Plus className="h-5 w-5" aria-hidden /> Yeni Kampanya Oluştur</Link>
            </Button>
            {[
              { href: "/creators", icon: Search, label: "Uygun Creator'ları Keşfet" },
              { href: "/dashboard/brand/applications", icon: Layers, label: "Başvuruları İncele", badge: pending },
              { href: "/dashboard/brand/payments", icon: FileText, label: "Ödemeleri Görüntüle" },
            ].map(({ href, icon: Icon, label, badge }) => (
              <Link key={href} href={href} className="glow-hover flex h-12 items-center gap-3 rounded-xl border border-border bg-white/[0.03] px-4 text-[15px] font-medium text-white hover:bg-white/[0.06]">
                <Icon className="h-5 w-5 text-white/90" aria-hidden />
                <span className="flex-1">{label}</span>
                {!!badge && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold">{badge}</span>}
                <ArrowRight className="h-4 w-4 text-white/70" aria-hidden />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex items-center justify-between px-5">
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-white"><Megaphone className="h-6 w-6 text-brand-light" aria-hidden /> Son Kampanyalarım</h2>
            <Link href="/dashboard/brand/campaigns" className="flex items-center gap-1 text-sm font-semibold text-brand-light hover:underline">Tümünü Gör <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          <div className="divide-y divide-border px-5">
            {campaigns.length === 0 && <EmptyState title="Henüz kampanyanız yok" description="İlk kampanyanızı oluşturup creator'lara ulaşın." className="py-8" />}
            {campaigns.slice(0, 3).map((c) => {
              const accepted = visibleApps.filter((a) => a.campaignId === c.id && a.status === "accepted").length;
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-4 py-4">
                  {c.coverUrl ? (
                    <Image src={c.coverUrl} alt="" width={84} height={64} className="h-16 w-[84px] shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-[84px] shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-light"><Megaphone className="h-6 w-6" aria-hidden /></div>
                  )}
                  <div className="min-w-0 flex-1 basis-48">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-white">{c.title}</p>
                      <CampaignStatusBadge status={c.status} awaitingPayment={c.awaitingPayment} />
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-text-soft"><CalendarDays className="h-4 w-4" aria-hidden /> {dateRange(c.startDate, c.endDate ?? c.applicationDeadline)}</p>
                  </div>
                  <div className="text-sm text-white/90">
                    <p><b>{c.applicantsCount ?? 0}</b> Başvuru</p>
                    <p className="mt-1 flex items-center gap-1 text-text-soft"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> {accepted} Onay</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5">
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-white"><Users className="h-6 w-6 text-brand-light" aria-hidden /> Son Başvurular</h2>
            <Link href="/dashboard/brand/applications" className="flex items-center gap-1 text-sm font-semibold text-brand-light hover:underline">Tümünü Gör <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          <div className="divide-y divide-border px-5">
            {recentApps.length === 0 && <EmptyState title="Henüz başvuru yok" description="Kampanyalarınıza gelen başvurular burada görünür." className="py-8" />}
            {recentApps.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-3.5">
                {a.creatorAvatarUrl ? (
                  <Image src={a.creatorAvatarUrl} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold">{a.creatorName.slice(0, 2).toUpperCase()}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate font-bold text-white">{a.creatorName}{a.creatorVerified && <BadgeCheck className="h-4 w-4 shrink-0 fill-verified text-white" aria-label="Doğrulanmış" />}</p>
                  <p className="text-sm text-text-soft">{formatShortNumber(a.creatorFollowers ?? 0)} Takipçi</p>
                </div>
                <Button variant="outline" size="sm" asChild><Link href="/dashboard/brand/applications">İncele <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
