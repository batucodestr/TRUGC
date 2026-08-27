"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Megaphone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignStatusBadge } from "@/features/campaigns/campaign-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { listCampaignsPaginated, bulkCampaignAction } from "@/lib/api/campaigns";
import { getErrorMessage } from "@/lib/error-message";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Campaign, CampaignStatus } from "@/types";

const PAGE_SIZE = 20;

export function CampaignManagementTable() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | CampaignStatus>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ action: "unpublish" | "close" | "delete"; ids: string[] } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);

  async function load() {
    setLoading(true);
    try {
      const res = await listCampaignsPaginated({ page, search: debouncedSearch || undefined, status: status === "all" ? undefined : status });
      setCampaigns(res.campaigns);
      setCount(res.count);
    } catch (err) {
      toast.error("Kampanyalar yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, status]);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const allSelected = campaigns.length > 0 && campaigns.every((c) => selected.has(c.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(campaigns.map((c) => c.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function runConfirmed() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      const { updated } = await bulkCampaignAction(confirm.ids, confirm.action);
      toast.success(`${updated} kampanya güncellendi`);
      setSelected(new Set());
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error("İşlem başarısız", { description: getErrorMessage(err) });
    } finally {
      setConfirmLoading(false);
    }
  }

  const confirmCopy = {
    unpublish: { title: "Yayından kaldır", description: "Seçilen kampanyalar taslağa döndürülecek." },
    close: { title: "Kampanyayı kapat", description: "Seçilen kampanyalar iptal edilmiş olarak işaretlenecek." },
    delete: { title: "Kampanyaları sil", description: "Seçilen kampanyalar kalıcı olarak silinecek. Bu işlem geri alınamaz." },
  } as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kampanya adı ile ara..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="draft">Taslak</SelectItem>
            <SelectItem value="published">Yayında</SelectItem>
            <SelectItem value="in_progress">Devam ediyor</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
            <SelectItem value="cancelled">İptal edildi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-600/30 bg-violet-600/5 px-4 py-2.5 text-sm">
          <span className="font-medium">{selected.size} kampanya seçildi</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirm({ action: "unpublish", ids: [...selected] })}>
              Yayından kaldır
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirm({ action: "close", ids: [...selected] })}>
              Kapat
            </Button>
            <Button size="sm" variant="destructive" className="rounded-full" onClick={() => setConfirm({ action: "delete", ids: [...selected] })}>
              Sil
            </Button>
          </div>
        </div>
      )}

      {!loading && campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="Kampanya bulunamadı" description="Arama veya filtre kriterlerinizi değiştirmeyi deneyin." />
      ) : (
        <Card className="overflow-hidden rounded-2xl border-border/70 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tümünü seç" />
                  </TableHead>
                  <TableHead>Kampanya</TableHead>
                  <TableHead>Marka</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Bütçe</TableHead>
                  <TableHead>Başvuranlar</TableHead>
                  <TableHead>Oluşturulma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(campaign.id)} onCheckedChange={() => toggleOne(campaign.id)} aria-label={`${campaign.title} seç`} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/campaigns/${campaign.slug}`} target="_blank" className="flex items-center gap-3">
                          <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {campaign.coverUrl && <Image src={campaign.coverUrl} alt={campaign.title} fill sizes="48px" className="object-cover" />}
                          </div>
                          <span className="max-w-[200px] truncate font-medium hover:text-violet-600">{campaign.title}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{campaign.brandName}</TableCell>
                      <TableCell>
                        <CampaignStatusBadge status={campaign.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(campaign.budgetMin)}–{formatCurrency(campaign.budgetMax)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{campaign.applicantsCount ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(campaign.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={page} pageSize={PAGE_SIZE} totalCount={count} onPageChange={setPage} />
        </Card>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? confirmCopy[confirm.action].title : ""}
        description={confirm ? confirmCopy[confirm.action].description : ""}
        confirmLabel={confirm ? confirmCopy[confirm.action].title : undefined}
        loading={confirmLoading}
        onConfirm={runConfirmed}
      />
    </div>
  );
}
