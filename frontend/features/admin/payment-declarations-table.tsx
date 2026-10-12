"use client";

// Admin: ödeme bildirimleri kuyruğu.
//
// Kullanıcı ödeme ekranında "Ödemeyi yaptım" dediğinde burada bir satır
// açılır ve adminlere bildirim gider. Admin dekontu bankada görünce onaylar:
// onay anında tutar kullanıcının bakiyesine yüklenir ve paket tanımlanır
// (bkz. apps/payments/declarations.py). Bildirimde bulunmak tek başına hiçbir
// hak kazandırmaz, bu yüzden kuyruk boşaltılmadan kimse paket kullanamaz.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import {
  listDeclarations,
  reviewDeclaration,
  type DeclarationStatus,
  type PaymentDeclaration,
} from "@/lib/api/declarations";
import { getErrorMessage } from "@/lib/error-message";
import { formatTryPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_TABS: { value: DeclarationStatus; label: string }[] = [
  { value: "pending", label: "Onay bekleyen" },
  { value: "approved", label: "Onaylanan" },
  { value: "rejected", label: "Reddedilen" },
];

const STATUS_STYLE: Record<DeclarationStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PaymentDeclarationsTable() {
  const [status, setStatus] = useState<DeclarationStatus>("pending");
  const [rows, setRows] = useState<PaymentDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listDeclarations(status));
    } catch (err) {
      toast.error("Ödeme bildirimleri yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(row: PaymentDeclaration, decision: "approve" | "reject") {
    setBusyId(row.id);
    try {
      await reviewDeclaration(row.id, decision, { note: notes[row.id] ?? "" });
      toast.success(decision === "approve" ? "Ödeme onaylandı" : "Bildirim reddedildi", {
        description:
          decision === "approve"
            ? `${row.userEmail} · ${row.packageName} paketi tanımlandı.`
            : `${row.userEmail} bilgilendirildi.`,
      });
      await load();
    } catch (err) {
      toast.error("İşlem yapılamadı", { description: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(value) => setStatus(value as DeclarationStatus)}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={load} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Yenile
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Kayıt yok"
          description={
            status === "pending"
              ? "Şu an onay bekleyen bir ödeme bildirimi bulunmuyor."
              : "Bu durumda bir kayıt bulunmuyor."
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="rounded-2xl border-border/70 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{row.userName || row.userEmail}</p>
                    <Badge className={cn("rounded-full border-none font-normal", STATUS_STYLE[row.status])}>
                      {row.statusLabel}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{row.userEmail}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-medium">
                      {row.packageName} · {row.tierLabel}
                    </span>
                    {row.campaignTitle && (
                      <span className="text-muted-foreground"> · Başvuru: {row.campaignTitle}</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatStamp(row.createdAt)}
                    {row.senderNote ? ` · Gönderen notu: ${row.senderNote}` : ""}
                  </p>
                  {row.status !== "pending" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.reviewedByEmail ? `${row.reviewedByEmail} tarafından` : "İncelendi"}
                      {row.reviewedAt ? ` · ${formatStamp(row.reviewedAt)}` : ""}
                      {row.reviewNote ? ` · ${row.reviewNote}` : ""}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-2xl font-semibold tracking-tight">{formatTryPrice(row.amount)}</p>
              </div>

              {row.status === "pending" && (
                <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Not (opsiyonel) — ör. dekont no veya red sebebi"
                    value={notes[row.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 rounded-full bg-gradient-brand hover:opacity-90"
                      onClick={() => review(row, "approve")}
                      disabled={busyId === row.id}
                    >
                      {busyId === row.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-full"
                      onClick={() => review(row, "reject")}
                      disabled={busyId === row.id}
                    >
                      <X className="size-3.5" /> Reddet
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
