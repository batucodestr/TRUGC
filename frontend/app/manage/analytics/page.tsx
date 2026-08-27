import { Activity, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsChart } from "@/components/shared/analytics-chart";
import { DistributionBars } from "@/components/shared/distribution-bars";
import { EmptyState } from "@/components/shared/empty-state";
import { StatsCard } from "@/components/Cards/StatsCard";
import { ExportCsvButton } from "@/features/admin/export-csv-button";
import { getAdminDashboard } from "@/lib/api/analytics";
import { listTransactions, bucketTransactionsByMonth } from "@/lib/api/finance";
import { formatCurrency } from "@/lib/format";

const CAMPAIGN_STATUS_LABEL_TR: Record<string, string> = {
  draft: "Taslak",
  published: "Yayında",
  in_progress: "Devam ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

const APPLICATION_STATUS_LABEL_TR: Record<string, string> = {
  pending: "Beklemede",
  accepted: "Onaylandı",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
};

export default async function AdminAnalyticsPage() {
  const [dashboard, transactions] = await Promise.all([getAdminDashboard(), listTransactions()]);
  const monthlyVolume = bucketTransactionsByMonth(transactions);
  const totalVolume = transactions.reduce((s, t) => s + parseFloat(t.amount), 0);

  const registrationChartData = dashboard.registration_trend.map((row) => ({
    label: new Date(row.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
    value: row.count,
  }));

  const applicationTotal = Object.values(dashboard.application_status_breakdown).reduce((s, n) => s + n, 0);
  const conversionRate = applicationTotal > 0 ? Math.round(((dashboard.application_status_breakdown.accepted ?? 0) / applicationTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analitik</h1>
          <p className="text-muted-foreground">Kayıt, büyüme, kampanya ve başvuru performansı — PostgreSQL&apos;den canlı.</p>
        </div>
        <ExportCsvButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Toplam kampanya" value={String(dashboard.total_campaigns)} icon={Activity} />
        <StatsCard label="Yayında kampanya" value={String(dashboard.published_campaigns)} icon={TrendingUp} />
        <StatsCard label="Toplam başvuru" value={String(dashboard.total_applications)} icon={Users} />
        <StatsCard label="Başvuru dönüşüm oranı" value={`%${conversionRate}`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Kayıt trendi (son 30 gün)</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart data={registrationChartData} className="h-56 w-full" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">İşlem hacmi (aya göre)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyVolume.length > 0 ? (
              <AnalyticsChart data={monthlyVolume} className="h-56 w-full" />
            ) : (
              <EmptyState title="Yeterli veri yok" description="İşlem hacmi grafiği için henüz yeterli veri bulunmuyor." className="h-56" />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Creator büyümesi vs Marka büyümesi</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBars data={[{ label: "Creator", value: dashboard.total_creators }, { label: "Marka", value: dashboard.total_brands }]} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Kampanya başarısı</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(dashboard.campaign_status_breakdown).length > 0 ? (
              <DistributionBars
                colorClassName="bg-blue-500"
                data={Object.entries(dashboard.campaign_status_breakdown).map(([status, n]) => ({ label: CAMPAIGN_STATUS_LABEL_TR[status] ?? status, value: n }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Henüz kampanya yok.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Başvuru dönüşümü</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(dashboard.application_status_breakdown).length > 0 ? (
              <DistributionBars
                colorClassName="bg-fuchsia-500"
                data={Object.entries(dashboard.application_status_breakdown).map(([status, n]) => ({ label: APPLICATION_STATUS_LABEL_TR[status] ?? status, value: n }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Henüz başvuru yok.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">En aktif kategoriler</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.top_categories.length > 0 ? (
              <DistributionBars colorClassName="bg-emerald-500" data={dashboard.top_categories.map((c) => ({ label: c.name, value: c.count }))} />
            ) : (
              <p className="text-sm text-muted-foreground">Henüz kategori verisi yok.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex h-full flex-col justify-center px-5 py-5">
            <p className="text-sm text-muted-foreground">Platform işlem hacmi</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalVolume, { compact: true })}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
