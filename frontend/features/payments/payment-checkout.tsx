"use client";

// Başvuru sonrası ödeme ekranı.
//
// Akış: creator kampanyaya başvurur → buraya gelir → paketini ve süresini
// seçip havale/EFT bilgilerini görür → ödeyip "Ödemeyi yaptım" der. O an bir
// ödeme bildirimi açılır ve adminlere sırasıyla "ödeme bildirimi geldi" ve
// "yeni kampanya başvurusu" bildirimi gider (bkz. apps/payments/declarations.py).
//
// Aktif paketi olan kullanıcıya ödeme istenmez: başvurusunun alındığı
// söylenir, çünkü başvuru hakkı zaten paketinden düşmüştür.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Banknote, Check, CheckCircle2, Info, Loader2, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyField } from "@/components/shared/copy-field";
import { PaymentMethods } from "@/components/shared/payment-methods";
import {
  BANK_ACCOUNT,
  COMPANY,
  PAYMENT_APPROVAL_BADGE,
  PAYMENT_APPROVAL_MINUTES,
  PAYMENT_APPROVAL_NOTICE,
} from "@/lib/company";
import { CREATOR_PACKAGES } from "@/lib/content/packages";
import { declarePayment } from "@/lib/api/declarations";
import { getMyWallet, type MyWallet } from "@/lib/api/wallet";
import { getErrorMessage } from "@/lib/error-message";
import { formatTryPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = "choose" | "pay" | "done";

export function PaymentCheckout() {
  const router = useRouter();
  const params = useSearchParams();
  const applicationId = params.get("application");
  const campaignTitle = params.get("campaign") ?? "";

  const [wallet, setWallet] = useState<MyWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [packageId, setPackageId] = useState(CREATOR_PACKAGES[0]!.id);
  const [tierId, setTierId] = useState(CREATOR_PACKAGES[0]!.tiers[CREATOR_PACKAGES[0]!.tiers.length - 1]!.id);
  const [senderNote, setSenderNote] = useState("");
  const [step, setStep] = useState<Step>("choose");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setWallet(await getMyWallet());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPackage = CREATOR_PACKAGES.find((p) => p.id === packageId)!;
  const selectedTier = selectedPackage.tiers.find((t) => t.id === tierId) ?? selectedPackage.tiers[0]!;

  async function declare() {
    setSending(true);
    try {
      // Paket kimliği ve süre kodu sunucudaki katalogla birebir aynıdır
      // (bkz. apps/payments/packages.py); tutar gönderilmez, sunucu türetir.
      await declarePayment({
        packageCode: selectedPackage.id,
        tierCode: selectedTier.code,
        applicationId,
        senderNote,
      });
      setStep("done");
      toast.success("Ödeme bildiriminiz alındı", { description: PAYMENT_APPROVAL_NOTICE });
    } catch (err) {
      toast.error("Bildirim gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasActivePackage = wallet?.membership.isActive ?? false;

  // --- Aktif paketi olan kullanıcı: ödeme yok, onay var ---
  if (hasActivePackage && step !== "done") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="rounded-2xl border-emerald-500/30 bg-emerald-50/60 p-7 text-center shadow-sm dark:bg-emerald-500/10">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Başvurunuz alındı</h1>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            {campaignTitle ? `"${campaignTitle}" kampanyasına başvurunuz iletildi.` : "Başvurunuz iletildi."} Aktif
            paketiniz olduğu için ek bir ödeme gerekmiyor.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <Badge className="rounded-full border-none bg-emerald-100 font-normal text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              {wallet!.membership.packageName} · {wallet!.membership.tierLabel}
            </Badge>
            <span className="text-muted-foreground">
              Kalan başvuru hakkı:{" "}
              <span className="font-medium text-foreground">
                {wallet!.membership.remainingApplications === null
                  ? "Sınırsız"
                  : wallet!.membership.remainingApplications}
              </span>
            </span>
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button className="rounded-full bg-gradient-brand hover:opacity-90" asChild>
              <Link href="/dashboard/creator/applications">Başvurularım</Link>
            </Button>
            <Button variant="outline" className="rounded-full" asChild>
              <Link href="/campaigns">Kampanyalara dön</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // --- Bildirim gönderildi ---
  if (step === "done") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="rounded-2xl border-emerald-500/30 bg-emerald-50/60 p-7 text-center shadow-sm dark:bg-emerald-500/10">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Ödeme bildiriminiz alındı</h1>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">{PAYMENT_APPROVAL_NOTICE}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Onaylandığında bildirim göndereceğiz. Sorunuz olursa çağrı destek hattımız:{" "}
            <a href={`tel:${COMPANY.phoneHref}`} className="font-medium text-foreground underline underline-offset-4">
              {COMPANY.phone}
            </a>
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button className="rounded-full bg-gradient-brand hover:opacity-90" onClick={() => router.push("/dashboard/creator")}>
              Panele dön
            </Button>
            <Button variant="outline" className="rounded-full" asChild>
              <Link href="/dashboard/creator/applications">Başvurularım</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // --- Paket seçimi + ödeme bilgileri ---
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ödeme</h1>
        <p className="mt-1 text-muted-foreground">
          {campaignTitle
            ? `"${campaignTitle}" kampanyasına başvurunuz alındı. Başvurunuzun markaya iletilmesi için paketinizi aktifleştirin.`
            : "Kampanyalara başvurabilmek için paketinizi aktifleştirin."}
        </p>
      </div>

      <div
        className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
        role="status"
      >
        <Timer className="size-4 shrink-0" />
        Ödemeniz {PAYMENT_APPROVAL_MINUTES} dakika içinde onaylanır
      </div>

      {/* 1. Paket */}
      <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
        <h2 className="text-sm font-semibold">1. Paketinizi seçin</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CREATOR_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => {
                setPackageId(pkg.id);
                setTierId(pkg.tiers[pkg.tiers.length - 1]!.id);
              }}
              aria-pressed={pkg.id === packageId}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition-colors",
                pkg.id === packageId
                  ? "border-violet-600 bg-violet-50 dark:bg-violet-500/15"
                  : "border-border/60 bg-muted/40 hover:border-violet-600/40",
              )}
            >
              <p className="font-medium">{pkg.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{pkg.tagline}</p>
            </button>
          ))}
        </div>

        <h3 className="mt-6 text-sm font-semibold">2. Süre</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {selectedPackage.tiers.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setTierId(tier.id)}
              aria-pressed={tier.id === selectedTier.id}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                tier.id === selectedTier.id
                  ? "border-violet-600 bg-violet-50 dark:bg-violet-500/15"
                  : "border-border/60 bg-muted/40 hover:border-violet-600/40",
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {tier.label}
              </span>
              <span className="text-sm font-semibold">{formatTryPrice(tier.price)}</span>
              <span className="text-[11px] text-muted-foreground">{tier.applications} başvuru</span>
            </button>
          ))}
        </div>
      </Card>

      {/* 2. Ödeme */}
      <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white">
            <Banknote className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">3. Havale / EFT ile ödeyin</h2>
            <p className="text-xs text-muted-foreground">Ödemeniz {PAYMENT_APPROVAL_BADGE}.</p>
          </div>
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 px-5 py-4">
          <div>
            <p className="text-sm font-medium">
              {selectedPackage.name} · {selectedTier.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedTier.applications} iş başvuru hakkı · KDV dahil
            </p>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{formatTryPrice(selectedTier.price)}</p>
        </div>

        <div className="mt-5 space-y-3">
          <CopyField label="Hesap adı" value={BANK_ACCOUNT.accountName} mono={false} />
          <CopyField label="Şirket IBAN" value={BANK_ACCOUNT.iban} copyValue={BANK_ACCOUNT.ibanPlain} />
          <CopyField
            label="Ödenecek tutar"
            value={formatTryPrice(selectedTier.price)}
            copyValue={String(selectedTier.price)}
            copyLabel="Tutar"
            mono={false}
          />
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted/50 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Havale açıklamasına{" "}
            <span className="font-medium text-foreground">
              &ldquo;TRUGC {selectedPackage.name} {selectedTier.label} — kullanıcı adınız&rdquo;
            </span>{" "}
            yazın. Açıklama eksikse ödemenizi hesabınızla eşleştiremeyiz.
          </span>
        </div>

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="sender-note" className="text-xs">
            Gönderen adı / dekont no (opsiyonel)
          </Label>
          <Input
            id="sender-note"
            placeholder="Ör. Ahmet Yılmaz · dekont 123456"
            value={senderNote}
            onChange={(e) => setSenderNote(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Havaleyi başkasının hesabından yaptıysanız burayı doldurmanız onayı hızlandırır.
          </p>
        </div>

        <Button
          className="mt-6 w-full gap-2 rounded-full bg-gradient-brand hover:opacity-90"
          size="lg"
          onClick={declare}
          disabled={sending}
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Ödemeyi yaptım
        </Button>

        <div className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-4">
          <PaymentMethods showNote={false} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Kredi/banka kartıyla ödeme altyapımız kurulum aşamasındadır; tamamlandığında ödemeler iyzico 3D Secure
            ile bu ekrandan alınacaktır.{" "}
            <Link href="/mesafeli-satis-sozlesmesi" className="underline underline-offset-4 hover:text-foreground">
              Mesafeli satış sözleşmesi
            </Link>{" "}
            ·{" "}
            <Link href="/teslimat-ve-iade" className="underline underline-offset-4 hover:text-foreground">
              Teslimat ve iade koşulları
            </Link>
          </p>
        </div>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Paketleri karşılaştırmak isterseniz{" "}
        <Link href="/fiyatlandirma" className="font-medium text-foreground underline underline-offset-4">
          fiyatlandırma sayfasına <ArrowRight className="inline size-3" />
        </Link>{" "}
        göz atabilirsiniz.
      </p>
    </div>
  );
}
