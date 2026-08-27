import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { listMyApplications } from "@/lib/api/applications";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types";

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  withdrawn: "bg-muted text-muted-foreground",
};

const STATUS_LABEL_TR: Record<ApplicationStatus, string> = {
  pending: "Beklemede",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
};

const TABS: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "pending", label: "Beklemede" },
  { value: "accepted", label: "Kabul edildi" },
  { value: "rejected", label: "Reddedildi" },
  { value: "withdrawn", label: "Geri çekildi" },
];

export default async function CreatorApplicationsPage() {
  const applications = await listMyApplications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Başvurularım</h1>
        <p className="text-muted-foreground">Başvurduğunuz kampanyaların durumunu takip edin.</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const list = tab.value === "all" ? applications : applications.filter((a) => a.status === tab.value);
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-6 space-y-3">
              {list.length === 0 ? (
                <EmptyState icon={FileText} title="Henüz bir şey yok" description="Bu filtreye uyan başvurular burada listelenecek." />
              ) : (
                list.map((app) => {
                  const content = (
                    <div className="flex min-w-0 items-center gap-3">
                      {app.campaignCoverUrl ? (
                        <Image src={app.campaignCoverUrl} alt={app.campaignTitle} width={52} height={52} className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-medium text-muted-foreground">
                          {app.campaignTitle.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{app.campaignTitle}</p>
                        {app.brandName && <p className="text-xs text-muted-foreground">{app.brandName}</p>}
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">{formatRelativeTime(app.appliedAt)} başvuruldu</p>
                      </div>
                    </div>
                  );
                  return (
                    <Card key={app.id} className="flex flex-col gap-3 rounded-2xl border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* No numeric campaign id comes back on Application reads (write-only field), so this can't deep-link to the campaign. */}
                      {app.campaignId ? <Link href={`/campaigns/${app.campaignId}`}>{content}</Link> : content}
                      <div className="flex shrink-0 items-center gap-3">
                        {app.proposedPrice != null && <span className="text-sm font-medium">{formatCurrency(app.proposedPrice)}</span>}
                        <Badge className={cn("border-none font-medium", STATUS_STYLE[app.status])}>{STATUS_LABEL_TR[app.status]}</Badge>
                      </div>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
