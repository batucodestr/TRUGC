import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileText, Megaphone, MessageSquare, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/Cards/StatsCard";
import { AnalyticsChart } from "@/components/shared/analytics-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { CampaignStatusBadge } from "@/features/campaigns/campaign-status-badge";
import { listMyCampaigns } from "@/lib/api/campaigns";
import { listApplications } from "@/lib/api/applications";
import { getBrandDashboard } from "@/lib/api/analytics";
import { listTransactions, bucketTransactionsByMonth } from "@/lib/api/finance";
import { formatCurrency, formatRelativeTime } from "@/lib/format";

export default async function BrandDashboardPage() {
  const [campaigns, allApplications, dashboard, transactions] = await Promise.all([
    listMyCampaigns(),
    listApplications(),
    getBrandDashboard(),
    listTransactions(),
  ]);
  const applications = [...allApplications].sort((a, b) => +new Date(b.appliedAt) - +new Date(a.appliedAt)).slice(0, 5);
  const monthlySpend = bucketTransactionsByMonth(transactions);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tekrar hoş geldiniz, Lumo Skincare</h1>
          <p className="text-muted-foreground">Kampanyalarınızda neler oluyor, işte özet.</p>
        </div>
        <Button className="gap-2 rounded-full bg-gradient-brand hover:opacity-90" asChild>
          <Link href="/dashboard/brand/campaigns/new">
            <Megaphone className="h-4 w-4" /> Yeni kampanya
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Aktif kampanyalar" value={String(dashboard.active_campaigns)} icon={Megaphone} />
        <StatsCard label="Toplam başvuran" value={String(dashboard.total_applicants)} icon={FileText} />
        <StatsCard label="Kabul edilen başvuran" value={String(dashboard.accepted_applicants)} icon={MessageSquare} />
        <StatsCard label="Taahhüt edilen bütçe" value={formatCurrency(dashboard.total_budget_committed, { compact: true })} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Zaman içinde harcama</CardTitle>
            <Badge variant="secondary" className="rounded-full font-normal">Aya göre</Badge>
          </CardHeader>
          <CardContent>
            {monthlySpend.length > 0 ? (
              <AnalyticsChart data={monthlySpend} className="h-64 w-full" />
            ) : (
              <EmptyState title="Yeterli veri yok" description="Harcama grafiği için henüz yeterli işlem geçmişi bulunmuyor." className="h-64" />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Son başvuranlar</CardTitle>
            <Link href="/dashboard/brand/applications" className="text-xs font-medium text-violet-600 hover:underline">
              Tümünü gör
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {applications.map((app) => (
              <Link
                key={app.id}
                href="/dashboard/brand/applications"
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted"
              >
                {app.creatorAvatarUrl ? (
                  <Image src={app.creatorAvatarUrl} alt={app.creatorName} width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {app.creatorName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{app.creatorName}</p>
                  <p className="truncate text-xs text-muted-foreground">{app.campaignTitle}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(app.appliedAt)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Kampanyalarınız</CardTitle>
          <Link href="/dashboard/brand/campaigns" className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline">
            Tümünü yönet <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {campaigns.slice(0, 5).map((campaign) => (
            <div key={campaign.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{campaign.title}</p>
                <p className="text-xs text-muted-foreground">
                  {campaign.applicantsCount != null ? `${campaign.applicantsCount} başvuran · ` : ""}
                  {formatCurrency(campaign.budgetMin)}–{formatCurrency(campaign.budgetMax)}
                </p>
              </div>
              <CampaignStatusBadge status={campaign.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
