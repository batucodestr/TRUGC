// Panodaki "bakiyem ve paketim" kartı.
//
// Bakiye admin tarafından elle yükleniyor (havale/EFT akışı), bu yüzden
// kullanıcının parasının hesabına geçtiğini görebileceği bir yer olmalı —
// aksi halde ödeme yapan kullanıcı sonucu yalnızca destek hattını arayarak
// öğrenebilirdi.

import Link from "next/link";
import { ArrowRight, CalendarClock, Send, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMyWallet } from "@/lib/api/wallet";
import { formatTryPrice } from "@/lib/format";

export async function MembershipStatusCard({ audience }: { audience: "creator" | "brand" }) {
  const data = await getMyWallet();
  if (!data) return null;

  const { membership } = data;
  const quotaLabel =
    membership.applicationQuota === null
      ? "Sınırsız"
      : `${membership.remainingApplications} / ${membership.applicationQuota}`;

  return (
    <Card className="flex flex-col gap-5 rounded-2xl border-border/70 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-lg shadow-violet-600/25">
          <Wallet className="size-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Bakiyeniz</p>
          <p className="text-2xl font-semibold tracking-tight">{formatTryPrice(data.balance)}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-3 lg:justify-center">
        {membership.isActive ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Üyelik paketi</p>
              <Badge className="mt-1 rounded-full border-none bg-emerald-100 font-normal text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                {membership.packageName} · {membership.tierLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Send className="size-4 text-violet-600" />
              <span className="text-muted-foreground">
                {audience === "creator" ? "Başvuru hakkı" : "Creator başvuru hakkı"}:
              </span>
              <span className="font-medium">{quotaLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <CalendarClock className="size-4 text-violet-600" />
              <span className="text-muted-foreground">Kalan süre:</span>
              <span className="font-medium">{membership.daysRemaining} gün</span>
            </div>
          </>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">Üyelik paketi</p>
            <p className="mt-0.5 text-sm">
              {membership.packageCode
                ? `${membership.packageName} paketinizin süresi doldu.`
                : "Henüz bir paketiniz yok."}
            </p>
          </div>
        )}
      </div>

      <Button variant={membership.isActive ? "outline" : "default"} className="shrink-0 rounded-full" asChild>
        <Link href="/fiyatlandirma">
          {membership.isActive ? "Paketleri gör" : "Paket seç"} <ArrowRight className="size-4" />
        </Link>
      </Button>
    </Card>
  );
}
