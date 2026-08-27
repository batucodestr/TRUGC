"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Flag, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { resolveReport, type Report } from "@/lib/api/reports";
import { getErrorMessage } from "@/lib/error-message";

const STATUS_STYLE = {
  open: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  dismissed: "bg-muted text-muted-foreground",
};

const STATUS_LABEL_TR: Record<Report["status"], string> = {
  open: "Açık",
  resolved: "Çözüldü",
  dismissed: "Reddedildi",
};

const TARGET_LABEL_TR: Record<Report["target_type"], string> = {
  creator: "Creator",
  brand: "Marka",
  campaign: "Kampanya",
  message: "Mesaj",
};

export function ReportsTable({ reports: initial }: { reports: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function updateStatus(id: number, status: "resolved" | "dismissed", label: string) {
    setPendingId(id);
    try {
      const updated = await resolveReport(id, status);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success(label);
    } catch (err) {
      toast.error("İşlem tamamlanamadı", { description: getErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  }

  if (reports.length === 0) {
    return <EmptyState icon={Flag} title="Rapor yok" description="Kullanıcı bildirimleri burada görünecek." />;
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <Card key={report.id} className="flex flex-col gap-3 rounded-2xl border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full font-normal">
                {TARGET_LABEL_TR[report.target_type]}
              </Badge>
              <p className="text-sm font-medium">#{report.target_id}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{report.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {report.reporter_email} tarafından bildirildi · {formatRelativeTime(report.created_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge className={cn("border-none font-medium", STATUS_STYLE[report.status])}>{STATUS_LABEL_TR[report.status]}</Badge>
            {report.status === "open" &&
              (pendingId === report.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Button size="sm" className="gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(report.id, "resolved", "Rapor çözüldü olarak işaretlendi")}>
                    <Check className="h-3.5 w-3.5" /> Çözüldü
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={() => updateStatus(report.id, "dismissed", "Rapor reddedildi")}>
                    <X className="h-3.5 w-3.5" /> Reddet
                  </Button>
                </>
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
