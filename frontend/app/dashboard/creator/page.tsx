import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Check, Eye, Flame, Handshake, Layers, Lightbulb, Megaphone, Wallet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatsCard } from "@/components/Cards/StatsCard";
import { EmptyState } from "@/components/shared/empty-state";
import { EarningsBars } from "@/components/shared/earnings-bars";
import { MembershipStatusCard } from "@/components/shared/membership-status-card";
import { InstagramIcon, TikTokIcon, YoutubeIcon } from "@/components/shared/brand-icons";
import { listRecommendedCampaigns } from "@/lib/api/campaigns";
import { getCreatorDashboard } from "@/lib/api/analytics";
import { listCollaborations, COLLABORATION_STATUS_TR, type CollaborationStatus } from "@/lib/api/collaborations";
import { listNotifications } from "@/lib/api/notifications";
import { getMyDisplayName } from "@/lib/api/me";
import { formatCurrency, formatShortNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

function trend(pct: number | null | undefined) {
  if (pct == null) return undefined;
  return { value: `${pct >= 0 ? "+" : ""}%${Math.abs(pct)}`, positive: pct >= 0 };
}

const COLLAB_BADGE: Record<CollaborationStatus, string> = {
  awaiting_content: "bg-white/10 text-[#d4d2e3]",
  delivered: "bg-info/20 text-[#7db5ff]",
  revision: "bg-crown/15 text-crown",
  approved: "bg-success/15 text-success",
  paid: "bg-success/15 text-success",
  cancelled: "bg-red-500/15 text-red-400",
};

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export default async function CreatorDashboardPage() {
  const [name, dashboard, recommended, collaborations, notifications] = await Promise.all([
    getMyDisplayName(),
    getCreatorDashboard(),
    listRecommendedCampaigns().catch(() => []),
    listCollaborations().catch(() => []),
    listNotifications().catch(() => []),
  ]);
  const completion = dashboard.profile_completion;
  const checklist = [
    { label: "Temel bilgiler", done: completion.basic },
    { label: "Sosyal medya hesapları", done: completion.social },
    { label: "İçerik portföyü (3+ içerik)", done: completion.portfolio },
    { label: "Kitle ve istatistik bilgileri", done: completion.stats },
  ];
  const earningsBars = dashboard.monthly_earnings.map((m) => ({ label: MONTHS_TR[Number(m.month.slice(5)) - 1], value: m.total }));
  const announcements = notifications.filter((n) => n.type === "system" || n.type === "campaign").slice(0, 1);
  const circumference = 2 * Math.PI * 28;

  return (
    <div className="space-y-6">
      {/* Karşılama */}
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute -inset-x-4 -top-8 h-64 bg-[radial-gradient(36rem_14rem_at_88%_30%,rgb(139_61_255/0.35),transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute right-6 top-0 hidden gap-3 md:flex">
          <span className="animate-float flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] shadow-[0_8px_24px_rgb(139_61_255/0.4)]"><InstagramIcon className="h-7 w-7 text-white" /></span>
          <span className="animate-float flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#0e0c1a]" style={{ animationDelay: "1s" }}><TikTokIcon className="h-7 w-7 text-white" /></span>
          <span className="animate-float flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff2a2a] to-[#c40000]" style={{ animationDelay: "2s" }}><YoutubeIcon className="h-7 w-7 text-white" /></span>
        </div>
        <div className="relative">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Merhaba <span className="text-brand-light">{name}</span>! 👋</h1>
          <p className="mt-2 max-w-xl text-text-soft">Senin için seçilen yeni kampanyaları keşfet, başvur ve markalarla işbirliği yaparak kazancını artır.</p>
        </div>
      </div>

      <MembershipStatusCard audience="creator" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Aktif İşbirliği" value={String(dashboard.active_collaborations)} icon={Layers} />
        <StatsCard label="Toplam Başvuru" value={String(dashboard.total_applications_sent)} icon={FileText} trend={trend(dashboard.applications_trend_pct)} />
        <StatsCard label="Toplam Erişim" value={formatShortNumber(dashboard.total_reach)} icon={Eye} />
        <StatsCard label="Toplam Kazanç" value={formatCurrency(dashboard.earnings)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between px-5">
              <h2 className="flex items-center gap-2.5 text-xl font-bold text-white"><Flame className="h-6 w-6 text-brand-light" aria-hidden /> Senin İçin Önerilen Kampanyalar</h2>
              <Link href="/campaigns" className="flex items-center gap-1 text-sm font-semibold text-brand-light hover:underline">Tüm Kampanyaları Gör <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            <div className="grid grid-cols-1 gap-4 px-5 sm:grid-cols-2 xl:grid-cols-4">
              {recommended.length === 0 && <div className="col-span-full"><EmptyState title="Şu an önerilen kampanya yok" description="Profilini ve kategorilerini tamamladıkça sana uygun kampanyalar burada görünür." className="py-8" /></div>}
              {recommended.slice(0, 4).map((c) => (
                <Link key={c.id} href={`/campaigns/${c.slug}`} className="glow-hover group overflow-hidden rounded-2xl border border-border bg-white/[0.03]">
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-brand/30 to-fuchsia-glow/20">
                    {c.coverUrl && <Image src={c.coverUrl} alt="" fill sizes="240px" className="object-cover" />}
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold backdrop-blur">{c.categories[0] ?? "Genel"}</span>
                  </div>
                  <div className="space-y-2 p-3.5">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-white/90">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-bold">{c.brandName.slice(0, 1)}</span>
                      <span className="truncate">{c.brandName}</span>
                      {c.brandVerified && <BadgeCheck className="h-4 w-4 shrink-0 fill-verified text-white" aria-label="Doğrulanmış" />}
                    </p>
                    <p className="line-clamp-1 text-[15px] font-bold text-white">{c.title}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-lg font-extrabold text-white">{c.budgetMax ? formatCurrency(c.budgetMax) : "Ücretsiz"}</span>
                      <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-gradient-brand px-3 text-xs font-bold">Başvur <ArrowRight className="h-3 w-3" aria-hidden /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Card>
              <div className="flex items-center justify-between px-5">
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-white"><Wallet className="h-6 w-6 text-brand-light" aria-hidden /> Kazançlarım</h2>
                <Link href="/dashboard/creator/earnings" className="text-sm font-semibold text-brand-light hover:underline">Detay</Link>
              </div>
              <div className="px-5">
                <p className="text-3xl font-extrabold text-white">{formatCurrency(dashboard.earnings_this_month)}</p>
                {dashboard.earnings_trend_pct != null && (
                  <p className={cn("mt-1 text-sm font-bold", dashboard.earnings_trend_pct >= 0 ? "text-success" : "text-red-400")}>
                    {dashboard.earnings_trend_pct >= 0 ? "↑ +" : "↓ -"}%{Math.abs(dashboard.earnings_trend_pct)}
                  </p>
                )}
                <p className="text-xs text-text-soft">Son 30 gün</p>
                <div className="mt-3"><EarningsBars data={earningsBars} /></div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between px-5">
                <h2 className="flex items-center gap-2.5 text-xl font-bold text-white"><Handshake className="h-6 w-6 text-brand-light" aria-hidden /> Son İşbirliklerim</h2>
                <Link href="/dashboard/creator/collaborations" className="flex items-center gap-1 text-sm font-semibold text-brand-light hover:underline">Tümünü Gör <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
              <div className="divide-y divide-border px-5">
                {collaborations.length === 0 && <EmptyState title="Henüz işbirliğin yok" description="Kabul edilen başvuruların burada iş birliğine dönüşür." className="py-8" />}
                {collaborations.slice(0, 3).map((c) => (
                  <Link key={c.id} href="/dashboard/creator/collaborations" className="flex items-center gap-3 py-3.5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-light"><Megaphone className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{c.brand_name} – {c.campaign_title}</p>
                      <span className={cn("mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", COLLAB_BADGE[c.status])}>{COLLABORATION_STATUS_TR[c.status]}</span>
                    </div>
                    <span className="font-extrabold text-white">+{formatCurrency(Number(c.agreed_amount))}</span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Sağ kolon */}
        <div className="space-y-6">
          <Card>
            <div className="px-5">
              <div className="flex items-center gap-4">
                <div className="relative h-[72px] w-[72px] shrink-0">
                  <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden>
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#a855f7" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - completion.percent / 100)} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold">%{completion.percent}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Profil Tamamlama</h2>
                  <p className="text-sm leading-snug text-text-soft">Profilini tamamla, daha fazla kampanya ve işbirliği fırsatı yakala.</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2.5">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-center gap-3 text-sm text-white/90">
                    <span className="flex-1">{item.label}</span>
                    {item.done ? <Check className="h-5 w-5 text-success" aria-label="Tamamlandı" /> : <span className="h-5 w-5 rounded-full border border-white/25" aria-label="Eksik" />}
                  </li>
                ))}
              </ul>
              <Button className="mt-4 w-full" asChild><Link href="/dashboard/creator/profile">Tamamla <ArrowRight className="h-4 w-4" aria-hidden /></Link></Button>
            </div>
          </Card>

          <Card>
            <div className="px-5">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-white"><Megaphone className="h-5 w-5 text-brand-light" aria-hidden /> Duyurular</h2>
              {announcements.length === 0 ? (
                <p className="mt-3 text-sm text-text-soft">Şu an yeni duyuru yok.</p>
              ) : (
                announcements.map((n) => (
                  <Link key={n.id} href={n.link ?? "#"} className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-white/[0.03] p-3">
                    <p className="flex-1 text-sm text-white/90"><b>{n.title}</b> {n.body}</p>
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-notify" aria-label="Okunmadı" />}
                  </Link>
                ))
              )}
            </div>
          </Card>

          <div className="rounded-2xl border border-brand-light/30 bg-[linear-gradient(135deg,#7c3aed,#a855f7_60%,#c026d3)] p-5 shadow-[0_8px_30px_rgb(139_61_255/0.3)]">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Lightbulb className="h-5 w-5 text-crown" aria-hidden /> İpucu</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/90">Başvuru videonu özgün ve yaratıcı hazırlayarak kabul edilme şansını %70 artırabilirsin.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
