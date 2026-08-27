"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Check, Loader2, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Application, ApplicationStatus } from "@/types";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { acceptApplication, rejectApplication } from "@/lib/api/applications";
import { getErrorMessage } from "@/lib/error-message";

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  withdrawn: "bg-muted text-muted-foreground",
};

export function ApplicantRow({ application }: { application: Application }) {
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [pending, setPending] = useState(false);

  async function updateStatus(next: "accepted" | "rejected", label: string) {
    setPending(true);
    try {
      const updated = next === "accepted" ? await acceptApplication(application.id) : await rejectApplication(application.id);
      setStatus(updated.status);
      toast.success(label, { description: `${application.creatorName}'s application updated.` });
    } catch (err) {
      toast.error("İşlem tamamlanamadı", { description: getErrorMessage(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/creators/${application.creatorId || ""}`} className="flex min-w-0 items-center gap-3">
        <Image src={application.creatorAvatarUrl || ""} alt={application.creatorName} width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{application.creatorName}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{application.message}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">Applied {formatRelativeTime(application.appliedAt)}</p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="text-sm font-medium">{formatCurrency(application.proposedPrice || 0)}</span>
        <Badge className={cn("border-none font-medium capitalize", STATUS_STYLE[status])}>{status}</Badge>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
          <Link href="/dashboard/messages">
            <MessageSquare className="h-3.5 w-3.5" />
          </Link>
        </Button>
        {status === "pending" && (
          <>
            <Button
              size="icon"
              disabled={pending}
              className="h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => updateStatus("accepted", "Application accepted")}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={pending}
              className="h-8 w-8 rounded-full text-rose-600 hover:bg-rose-50"
              onClick={() => updateStatus("rejected", "Application rejected")}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
