"use client";

// Resmî OAuth ile sosyal hesap bağlama. Şifre ASLA istenmez: kullanıcı
// platformun kendi izin ekranına yönlendirilir ve yalnızca okuma izni verir.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Link2, Loader2, ShieldCheck, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { disconnectSocial, getAuthorizeUrl, OAUTH_PLATFORMS, type OAuthPlatform } from "@/lib/api/social";
import { getErrorMessage } from "@/lib/error-message";
import { formatShortNumber } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/constants";

export interface ConnectedAccount {
  platform: string;
  handle: string;
  followers_count: number;
  oauth_verified?: boolean;
  last_synced_at?: string | null;
}

export function SocialConnectCard({ accounts, isVerified }: { accounts: ConnectedAccount[]; isVerified: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function connect(platform: OAuthPlatform) {
    setBusy(platform);
    try {
      window.location.href = await getAuthorizeUrl(platform);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(null);
    }
  }

  async function disconnect(platform: OAuthPlatform) {
    setBusy(platform);
    try {
      await disconnectSocial(platform);
      toast.success("Hesap bağlantısı kaldırıldı.");
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <div className="space-y-4 px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-white">Bağlı Hesaplar</h2>
          {isVerified && <Badge variant="info" className="gap-1"><BadgeCheck className="h-3.5 w-3.5 fill-verified text-white" aria-hidden /> Doğrulanmış creator</Badge>}
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-brand/10 p-3 text-sm text-text-soft">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-light" aria-hidden />
          Hesabını resmî platform girişiyle bağlarsın; TRUGC sosyal medya şifreni asla görmez veya istemez. Takipçi ve erişim verilerin API üzerinden otomatik güncellenir.
        </p>
        <div className="space-y-3">
          {OAUTH_PLATFORMS.map((platform) => {
            const account = accounts.find((a) => a.platform === platform && a.oauth_verified);
            return (
              <div key={platform} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"><PlatformIcon platform={platform} className="h-5 w-5" /></span>
                  <div>
                    <p className="text-sm font-semibold text-white">{PLATFORM_LABEL[platform]}</p>
                    <p className="text-xs text-text-soft">{account ? `@${account.handle.replace(/^@/, "")} · ${formatShortNumber(account.followers_count)} takipçi` : "Bağlı değil"}</p>
                  </div>
                </div>
                {account ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="gap-1"><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Doğrulandı</Badge>
                    <Button variant="outline" size="sm" disabled={busy === platform} onClick={() => disconnect(platform)}>
                      {busy === platform ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" aria-hidden />} Kaldır
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" disabled={busy === platform} onClick={() => connect(platform)}>
                    {busy === platform ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" aria-hidden />} Hesabı Bağla
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
