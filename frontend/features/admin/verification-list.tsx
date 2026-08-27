"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, FileText, Loader2, ShieldCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/format";
import { reviewVerification, type ApiVerificationStatus } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";

const STATUS_LABEL_TR: Record<ApiVerificationStatus["status"], string> = {
  unverified: "Doğrulanmadı",
  pending: "Beklemede",
  verified: "Onaylandı",
  rejected: "Reddedildi",
};

export function VerificationList({ requests: initialRequests }: { requests: ApiVerificationStatus[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [pendingId, setPendingId] = useState<number | null>(null);

  if (requests.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Doğrulama talebi yok" description="Yeni başvurular burada görünecek." />;
  }

  async function handleDecision(id: number, decision: "approve" | "reject") {
    setPendingId(id);
    try {
      await reviewVerification(id, decision);
      // İncelenen talepler bekleyen kuyruktan ayrılır — kararın kendisi
      // (reviewed_at/reviewed_by/notes ile) VerificationStatus'ta saklanır,
      // bu yüzden hiçbir şey kaybolmaz, sadece artık bu "bekleyen" listeye ait değildir.
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(decision === "approve" ? "Doğrulama onaylandı" : "Doğrulama reddedildi");
    } catch (err) {
      toast.error("İşlem tamamlanamadı", { description: getErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <Card key={req.id} className="flex flex-col gap-3 rounded-2xl border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">{req.user.email || `#${req.user.id}`}</p>
              <p className="text-xs text-muted-foreground">
                {req.user.role} · {req.document ? "Belge yüklendi" : "Belge bekleniyor"}
                {req.submitted_at ? ` · ${formatRelativeTime(req.submitted_at)} gönderildi` : ""}
                {req.notes ? ` · ${req.notes}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                req.status === "verified"
                  ? "border-none bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : req.status === "rejected"
                    ? "border-none bg-rose-100 font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                    : "border-none bg-amber-100 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
              }
            >
              {STATUS_LABEL_TR[req.status]}
            </Badge>
            {req.status === "pending" && (
              <>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                  disabled={pendingId === req.id}
                  onClick={() => handleDecision(req.id, "approve")}
                >
                  {pendingId === req.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                  disabled={pendingId === req.id}
                  onClick={() => handleDecision(req.id, "reject")}
                >
                  {pendingId === req.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                </Button>
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
