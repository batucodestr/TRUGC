import Link from "next/link";
import { AlertTriangle, Flag, ShieldCheck, UserCog, Users, Megaphone, UserPlus, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/Cards/StatsCard";
import { AnalyticsChart } from "@/components/shared/analytics-chart";
import { DistributionBars } from "@/components/shared/distribution-bars";
import { getAdminDashboard } from "@/lib/api/analytics";

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

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();

  const registrationChartData = dashboard.registration_trend.map((row) => ({
    label: new Date(row.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }),
    value: row.count,
  }));

  const campaignStatusData = Object.entries(dashboard.campaign_status_breakdown).map(([status, count]) => ({
    label: CAMPAIGN_STATUS_LABEL_TR[status] ?? status,
    value: count,
  }));

  const applicationStatusData = Object.entries(dashboard.application_status_breakdown).map(([status, count]) => ({
    label: APPLICATION_STATUS_LABEL_TR[status] ?? status,
    value: count,
  }));

  const creatorBrandData = [
    { label: "Creator", value: dashboard.total_creators },
    { label: "Marka", value: dashboard.total_brands },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform genel bakışı</h1>
        <p className="text-muted-foreground">Büyümeyi, moderasyon kuyruklarını ve platform sağlığını takip edin.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Toplam kullanıcı" value={String(dashboard.total_users)} icon={Users} />
        <StatsCard label="Creator sayısı" value={String(dashboard.total_creators)} icon={UserCog} />
        <StatsCard label="Marka sayısı" value={String(dashboard.total_brands)} icon={ShieldCheck} />
        <StatsCard label="Aktif kampanya" value={String(dashboard.published_campaigns)} icon={Megaphone} />
        <StatsCard label="Bekleyen onay" value={String(dashboard.pending_verifications)} icon={AlertTriangle} />
        <StatsCard label="Yeni raporlar" value={String(dashboard.new_reports)} icon={Flag} />
        <StatsCard label="Bugünkü kayıtlar" value={String(dashboard.today_registrations)} icon={UserPlus} />
        <StatsCard label="Son 24 saat giriş" value={String(dashboard.last_24h_logins)} icon={LogIn} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Son 30 gün kayıtlar</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsChart data={registrationChartData} className="h-56 w-full" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Creator vs Marka dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBars data={creatorBrandData} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Kampanya durumu</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignStatusData.length > 0 ? (
              <DistributionBars data={campaignStatusData} colorClassName="bg-blue-500" />
            ) : (
              <p className="text-sm text-muted-foreground">Henüz kampanya yok.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Başvuru istatistikleri</CardTitle>
          </CardHeader>
          <CardContent>
            {applicationStatusData.length > 0 ? (
              <DistributionBars data={applicationStatusData} colorClassName="bg-fuchsia-500" />
            ) : (
              <p className="text-sm text-muted-foreground">Henüz başvuru yok.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex items-center gap-4 px-5 py-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Bekleyen onaylar</p>
              <p className="text-2xl font-semibold">{dashboard.pending_verifications}</p>
            </div>
            <Link href="/manage/verifications" className="text-xs font-medium text-violet-600 hover:underline">
              İncele
            </Link>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex items-center gap-4 px-5 py-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
              <Flag className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Açık raporlar</p>
              <p className="text-2xl font-semibold">{dashboard.new_reports}</p>
            </div>
            <Link href="/manage/reports" className="text-xs font-medium text-violet-600 hover:underline">
              İncele
            </Link>
          </CardContent>
        </Card>
      </div>

      {dashboard.top_categories.length > 0 && (
        <Card className="rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">En aktif kategoriler</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionBars data={dashboard.top_categories.map((c) => ({ label: c.name, value: c.count }))} colorClassName="bg-emerald-500" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
