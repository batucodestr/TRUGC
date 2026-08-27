"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, FileText, Loader2, Pause, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { listApplicationsPaginated, acceptApplication, rejectApplication, holdApplication } from "@/lib/api/applications";
import { getErrorMessage } from "@/lib/error-message";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Application, ApplicationStatus } from "@/types";

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  withdrawn: "bg-muted text-muted-foreground",
};

const STATUS_LABEL_TR: Record<ApplicationStatus, string> = {
  pending: "Beklemede",
  accepted: "Onaylandı",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
};

export function ApplicationManagementTable() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | ApplicationStatus>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await listApplicationsPaginated({ page, status: status === "all" ? undefined : status });
      setApplications(res.applications);
      setCount(res.count);
    } catch (err) {
      toast.error("Başvurular yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  useEffect(() => setPage(1), [status]);

  async function run(app: Application, fn: (id: string) => Promise<Application>, label: string) {
    setPendingId(app.id);
    try {
      await fn(app.id);
      toast.success(label);
      await load();
    } catch (err) {
      toast.error("İşlem başarısız", { description: getErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tüm durumlar</SelectItem>
          <SelectItem value="pending">Beklemede</SelectItem>
          <SelectItem value="accepted">Onaylandı</SelectItem>
          <SelectItem value="rejected">Reddedildi</SelectItem>
          <SelectItem value="withdrawn">Geri çekildi</SelectItem>
        </SelectContent>
      </Select>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : applications.length === 0 ? (
        <EmptyState icon={FileText} title="Başvuru bulunamadı" description="Seçili filtrede başvuru yok." />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id} className="flex flex-col gap-3 rounded-2xl border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{app.creatorName}</p>
                  <span className="text-xs text-muted-foreground">→</span>
                  <p className="text-sm text-muted-foreground">{app.campaignTitle}</p>
                  <Badge className={cn("border-none font-medium", STATUS_STYLE[app.status])}>{STATUS_LABEL_TR[app.status]}</Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{app.message}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {app.proposedPrice != null && `${formatCurrency(app.proposedPrice)} · `}
                  {formatRelativeTime(app.appliedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {pendingId === app.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    {app.status !== "accepted" && (
                      <Button size="sm" className="gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={() => run(app, acceptApplication, "Başvuru onaylandı")}>
                        <Check className="h-3.5 w-3.5" /> Onayla
                      </Button>
                    )}
                    {app.status !== "rejected" && (
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => run(app, rejectApplication, "Başvuru reddedildi")}>
                        <X className="h-3.5 w-3.5" /> Reddet
                      </Button>
                    )}
                    {app.status !== "pending" && (
                      <Button size="sm" variant="ghost" className="gap-1.5 rounded-full" onClick={() => run(app, holdApplication, "Başvuru beklemeye alındı")}>
                        <Pause className="h-3.5 w-3.5" /> Beklet
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls page={page} pageSize={PAGE_SIZE} totalCount={count} onPageChange={setPage} />
    </div>
  );
}
