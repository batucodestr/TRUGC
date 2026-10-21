"use client";

// Markanın başvuru listesindeki tek satır: başvuran creator, teklifi, durumu
// ve markanın alabileceği aksiyonlar (mesaj, kabul, red).
//
// Mesaj düğmesi eskiden boş /dashboard/messages sayfasına giden bir
// bağlantıydı, creator adı ise `/creators/undefined`a gidiyordu — API
// creator kimliklerini hiç döndürmediği için (bkz. apps/applications/
// serializers.py). Yani marka, kampanyasına başvuran kişiye panelden ne
// mesaj atabiliyor ne de profiline bakabiliyordu. İkisi de artık gerçek
// kimliklerle çalışıyor.

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Check, Loader2, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StartConversationDialog } from "@/components/shared/start-conversation-dialog";
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

const STATUS_LABEL_TR: Record<ApplicationStatus, string> = {
  pending: "Beklemede",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
};

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export function ApplicantRow({ application }: { application: Application }) {
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [pending, setPending] = useState(false);

  async function updateStatus(next: "accepted" | "rejected", label: string) {
    setPending(true);
    try {
      const updated = next === "accepted" ? await acceptApplication(application.id) : await rejectApplication(application.id);
      setStatus(updated.status);
      toast.success(label, { description: `${application.creatorName} başvurusu güncellendi.` });
    } catch (err) {
      toast.error("İşlem tamamlanamadı", { description: getErrorMessage(err) });
    } finally {
      setPending(false);
    }
  }

  const name = application.creatorName;
  // Avatarı olmayan creator'da `<Image src="">` ile boş bir src basmak yerine
  // baş harfler gösterilir: next/image boş src'yi kabul etmez ve satır
  // bileşeni render sırasında patlardı.
  const avatar = application.creatorAvatarUrl ? (
    <Image
      src={application.creatorAvatarUrl}
      alt={name}
      width={44}
      height={44}
      className="h-11 w-11 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initials(name)}
    </span>
  );

  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      {avatar}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{application.message}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          {formatRelativeTime(application.appliedAt)} başvurdu
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Profil bağlantısı yalnızca gerçek bir kimlik varsa verilir. */}
      {application.creatorId ? (
        <Link href={`/creators/${application.creatorId}`}>{identity}</Link>
      ) : (
        identity
      )}

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {application.proposedPrice != null && (
          <span className="text-sm font-medium">{formatCurrency(application.proposedPrice)}</span>
        )}
        <Badge className={cn("border-none font-medium", STATUS_STYLE[status])}>{STATUS_LABEL_TR[status]}</Badge>

        <StartConversationDialog
          recipientUserId={application.creatorUserId}
          recipientName={name}
          campaignId={application.campaignId}
          defaultMessage={
            application.campaignTitle ? `Merhaba, "${application.campaignTitle}" kampanyası hakkında...` : ""
          }
          trigger={
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" title="Mesaj gönder">
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          }
        />

        {status === "pending" && (
          <>
            <Button
              size="icon"
              disabled={pending}
              title="Kabul et"
              className="h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => updateStatus("accepted", "Başvuru kabul edildi")}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={pending}
              title="Reddet"
              className="h-8 w-8 rounded-full text-rose-600 hover:bg-rose-50"
              onClick={() => updateStatus("rejected", "Başvuru reddedildi")}
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
