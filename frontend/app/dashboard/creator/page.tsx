import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Briefcase, Eye, Star, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/Cards/StatsCard";
import { AnalyticsChart } from "@/components/shared/analytics-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { listMyApplications } from "@/lib/api/applications";
import { getCreatorDashboard } from "@/lib/api/analytics";
import { listTransactions, bucketTransactionsByMonth } from "@/lib/api/finance";
import { getMyDisplayName } from "@/lib/api/me";
import { formatCurrency, formatRelativeTime } from "@/lib/format";

export default async function CreatorDashboardPage() {
  const [firstName, applications, dashboard, transactions] = await Promise.all([
    getMyDisplayName(),
    listMyApplications(),
    getCreatorDashboard(),
    listTransactions(),
  ]);
  const monthlyEarnings = bucketTransactionsByMonth(transactions, ["released"]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tekrar hoş geldiniz, {firstName}</h1>
        <p className="text-muted-foreground">Creator işinizin genel bir görünümü.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Toplam kazanç" value={formatCurrency(dashboard.earnings, { compact: true })} icon={Wallet} />
        <StatsCard label="Aktif iş birlikleri" value={String(dashboard.collaborations)} icon={Briefcase} />
        <StatsCard label="Ortalama puan" value={dashboard.average_rating.toFixed(1)} icon={Star} />
        <StatsCard label="Profil görüntülenmesi" value={String(dashboard.profile_views)} icon={Eye} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Zaman içinde kazanç</CardTitle>
            <Badge variant="secondary" className="rounded-full font-normal">Aya göre</Badge>
          </CardHeader>
          <CardContent>
            {monthlyEarnings.length > 0 ? (
              <AnalyticsChart data={monthlyEarnings} className="h-64 w-full" />
            ) : (
              <EmptyState title="Yeterli veri yok" description="Kazanç grafiği için henüz yeterli işlem geçmişi bulunmuyor." className="h-64" />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Son başvurular</CardTitle>
            <Link href="/dashboard/creator/applications" className="text-xs font-medium text-violet-600 hover:underline">
              Tümünü gör
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {applications.slice(0, 5).map((app) => (
              <Link key={app.id} href="/dashboard/creator/applications" className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted">
                {app.campaignCoverUrl ? (
                  <Image src={app.campaignCoverUrl} alt={app.campaignTitle} width={40} height={40} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                    {app.campaignTitle.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{app.campaignTitle}</p>
                  {app.brandName && <p className="truncate text-xs text-muted-foreground">{app.brandName}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(app.appliedAt)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/70 bg-gradient-brand p-6 text-white">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-semibold">Yeni kampanyalar keşfedin</h3>
            <p className="text-sm text-white/80">Niş alanınıza ve kitlenize uygun açık fırsatlara göz atın.</p>
          </div>
          <Link href="/campaigns" className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-violet-700 transition-transform hover:scale-105">
            Kampanyalara göz at <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
