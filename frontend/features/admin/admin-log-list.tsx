"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { listAdminLogs } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { formatRelativeTime } from "@/lib/format";

const PAGE_SIZE = 20;

export function AdminLogList() {
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listAdminLogs>>["logs"]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  const debouncedFilter = useDebouncedValue(actionFilter, 350);

  async function load() {
    setLoading(true);
    try {
      const res = await listAdminLogs({ page, action: debouncedFilter || undefined });
      setLogs(res.logs);
      setCount(res.count);
    } catch (err) {
      toast.error("Loglar yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedFilter]);

  useEffect(() => setPage(1), [debouncedFilter]);

  return (
    <div className="space-y-4">
      <Input
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        placeholder="İşlem türüne göre filtrele (örn. user.ban, campaign.delete)..."
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Kayıt bulunamadı" description="Admin işlemleri gerçekleştikçe burada listelenecek." />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="flex flex-col gap-2 rounded-xl border-border/70 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full font-normal">{log.action}</Badge>
                  {log.targetType && (
                    <span className="text-xs text-muted-foreground">
                      {log.targetType}
                      {log.targetId && ` #${log.targetId}`}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.actorEmail ?? "Sistem"} {log.detail && `· ${log.detail}`}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</span>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls page={page} pageSize={PAGE_SIZE} totalCount={count} onPageChange={setPage} />
    </div>
  );
}
