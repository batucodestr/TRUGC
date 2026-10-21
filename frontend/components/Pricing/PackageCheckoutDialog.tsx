"use client";

// "Paketi Seç" → ödeme bilgileri → "Ödemeyi yaptım".
//
// Kullanıcı paketi seçtiğinde panele yönlendirilmek yerine ödeme bilgilerini
// doğrudan burada görür: seçtiği süre, ödenecek tutar, şirket IBAN'ı ve
// havale açıklamasına ne yazması gerektiği.
//
// **Bu diyalog eskiden yalnızca IBAN gösteriyordu**: kullanıcı parayı
// gönderiyor, hiçbir kayıt açılmıyor, adminlere bildirim gitmiyordu — ödeme
// ancak kullanıcı dekontu e-postayla yollarsa fark edilebiliyordu. Artık
// giriş yapmış kullanıcı buradan ödeme bildiriminde bulunur ve adminlere
// bildirim gider (bkz. apps/payments/declarations.py).
//
// Sanal POS henüz yapılandırılmadığı için (bkz. GET /payments/pricing/ →
// pos.configured) aktif tahsilat kanalı havale/EFT'tir. POS açıldığında bu
// diyaloğa "Kartla öde" düğmesi eklenir; o güne kadar kullanıcıya çalışmayan
// bir kart akışı gösterilmez.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, Check, CheckCircle2, Clock, Info, Loader2, LogIn, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyField } from "@/components/shared/copy-field";
import { PaymentMethods } from "@/components/shared/payment-methods";
import { useAuth } from "@/components/Auth/AuthProvider";
import { DASHBOARD_PATH_BY_ROLE } from "@/lib/auth";
import {
  BANK_ACCOUNT,
  COMPANY,
  PAYMENT_APPROVAL_BADGE,
  PAYMENT_APPROVAL_MINUTES,
  PAYMENT_APPROVAL_NOTICE,
} from "@/lib/company";
import type { CheckoutTier, PackageAudience } from "@/lib/content/packages";
import { declarePayment } from "@/lib/api/declarations";
import { getErrorMessage } from "@/lib/error-message";
import { formatTryPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PackageCheckoutDialogProps {
  /** Sunucudaki paket kodu (package_code) — bildirim bununla gönderilir. */
  packageCode: string;
  packageName: string;
  /** Paketin kime satıldığı; kullanıcının rolüyle eşleşmezse bildirim yerine
   *  kısa bir açıklama gösterilir (sunucu da aynı kuralı uygular). */
  audience: PackageAudience;
  options: CheckoutTier[];
  /** Ödeme sonrası kullanıcının devam edeceği panel. */
  dashboardHref: string;
  triggerClassName?: string;
  triggerVariant?: "default" | "outline";
}

const AUDIENCE_LABEL: Record<PackageAudience, string> = { creator: "creator", brand: "marka" };

export function PackageCheckoutDialog({
  packageCode,
  packageName,
  audience,
  options,
  dashboardHref,
  triggerClassName,
  triggerVariant = "outline",
}: PackageCheckoutDialogProps) {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  // Birden fazla süre varsa varsayılan olarak en uzunu (en avantajlısı) seçili
  // gelir — kullanıcı diyalog içinde değiştirebilir.
  const [selectedId, setSelectedId] = useState(options[options.length - 1]!.id);
  const [sending, setSending] = useState(false);
  const [declared, setDeclared] = useState(false);
  const selected = options.find((option) => option.id === selectedId) ?? options[0]!;
  const reference = `TRUGC ${packageName} ${selected.label}`;

  // Rolü bu paketin kitlesine uymayan kullanıcı bildirimde bulunamaz: sunucu
  // zaten 400 döner, kullanıcıyı o hataya göndermek yerine sebebi söylenir.
  const roleMatches = session?.user.role === audience;

  async function declare() {
    setSending(true);
    try {
      // Tutar gönderilmez; sunucu paket + süre kodundan kendisi türetir.
      await declarePayment({ packageCode, tierCode: selected.code });
      setDeclared(true);
      toast.success("Ödeme bildiriminiz alındı", { description: PAYMENT_APPROVAL_NOTICE });
    } catch (err) {
      toast.error("Bildirim gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={cn("rounded-full", triggerClassName)} variant={triggerVariant}>
          Paketi seç
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{packageName}</DialogTitle>
          <DialogDescription>
            Paketinizi aktifleştirmek için aşağıdaki hesaba ödeme yapın. {PAYMENT_APPROVAL_NOTICE}
          </DialogDescription>
        </DialogHeader>

        {declared ? (
          // --- Bildirim gönderildi ---
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/60 px-5 py-7 text-center dark:bg-emerald-500/10">
            <CheckCircle2 className="size-9 text-emerald-600" />
            <p className="text-base font-semibold">Ödeme bildiriminiz alındı</p>
            <p className="text-sm text-muted-foreground">
              {packageName} · {selected.label} · {formatTryPrice(selected.price)}
            </p>
            <p className="text-sm text-muted-foreground">
              {PAYMENT_APPROVAL_NOTICE} Onaylandığında bildirim göndereceğiz.
            </p>
            <Button className="mt-2 rounded-full bg-gradient-brand hover:opacity-90" asChild>
              <Link href={dashboardHref}>Panele git</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Ödeme akışının her adımında aynı söz: onay süresi. */}
            <div
              className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
              role="status"
            >
              <Timer className="size-4 shrink-0" />
              Ödemeniz {PAYMENT_APPROVAL_MINUTES} dakika içinde onaylanır
            </div>

            {options.length > 1 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Süre seçin</span>
                <div className="grid grid-cols-3 gap-2">
                  {options.map((option) => {
                    const active = option.id === selected.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedId(option.id)}
                        aria-pressed={active}
                        className={cn(
                          "flex flex-col items-start gap-0.5 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-violet-600 bg-violet-50 dark:bg-violet-500/15"
                            : "border-border/60 bg-muted/40 hover:border-violet-600/40",
                        )}
                      >
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {option.label}
                        </span>
                        <span className="text-sm font-semibold">{formatTryPrice(option.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sipariş özeti */}
            <div className="rounded-2xl border border-border/60 bg-muted/40 px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {packageName} · {selected.label}
                  </p>
                  {selected.note && <p className="mt-0.5 text-sm text-muted-foreground">{selected.note}</p>}
                </div>
                <p className="shrink-0 text-2xl font-semibold tracking-tight">{formatTryPrice(selected.price)}</p>
              </div>
              {/* iyzico şartı: fiyatlar TL cinsinden ve KDV dahil gösterilmeli. */}
              <p className="mt-1 text-xs text-muted-foreground">
                KDV dahil, Türk Lirası (TL) · Ödeme sonrası {PAYMENT_APPROVAL_BADGE}
              </p>
            </div>

            {/* Havale/EFT — şu anki aktif tahsilat kanalı */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border/60 px-5 py-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/25">
                  <Banknote className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">Havale / EFT ile ödeme</h3>
                  <p className="text-xs text-muted-foreground">Ödemeniz {PAYMENT_APPROVAL_BADGE}.</p>
                </div>
              </div>

              <CopyField label="Hesap adı" value={BANK_ACCOUNT.accountName} mono={false} />
              <CopyField label="Şirket IBAN" value={BANK_ACCOUNT.iban} copyValue={BANK_ACCOUNT.ibanPlain} />
              <CopyField
                label="Ödenecek tutar"
                value={formatTryPrice(selected.price)}
                copyValue={String(selected.price)}
                copyLabel="Tutar"
                mono={false}
              />

              <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Havale açıklamasına{" "}
                  <span className="font-medium text-foreground">
                    &ldquo;{reference} — kullanıcı adınız&rdquo;
                  </span>{" "}
                  yazın. Açıklama eksikse ödemenizi hesabınızla eşleştiremeyiz.
                </span>
              </div>
            </div>

            {/* Ödemeyi bildirme — bu akışın asıl adımı. */}
            {authLoading ? (
              <Button disabled className="w-full gap-2 rounded-full" size="lg">
                <Loader2 className="size-4 animate-spin" />
              </Button>
            ) : !session ? (
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full gap-2 rounded-full bg-gradient-brand hover:opacity-90"
                  size="lg"
                  onClick={() => router.push("/login")}
                >
                  <LogIn className="size-4" />
                  Giriş yapıp ödememi bildirin
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Ödemenizi hesabınızla eşleştirebilmemiz için bildirimi giriş yaptıktan sonra göndermeniz gerekir.
                </p>
              </div>
            ) : roleMatches ? (
              <Button
                className="w-full gap-2 rounded-full bg-gradient-brand hover:opacity-90"
                size="lg"
                onClick={declare}
                disabled={sending}
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Ödemeyi yaptım
              </Button>
            ) : (
              <p className="rounded-xl bg-muted/50 px-3.5 py-3 text-center text-xs leading-relaxed text-muted-foreground">
                Bu paket {AUDIENCE_LABEL[audience]} hesapları içindir; hesabınızla satın alınamaz.{" "}
                <Link
                  href={DASHBOARD_PATH_BY_ROLE[session.user.role]}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Kendi panelinize gidin
                </Link>
                .
              </p>
            )}

            {/* Ödeme sonrası */}
            <div className="flex flex-col gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-violet-600" />
                <span>
                  Dekontunuzu{" "}
                  <a href={`mailto:${COMPANY.email}`} className="font-medium text-foreground underline underline-offset-4">
                    {COMPANY.email}
                  </a>{" "}
                  adresine gönderin veya çağrı destek hattımızdan{" "}
                  <a href={`tel:${COMPANY.phoneHref}`} className="font-medium text-foreground underline underline-offset-4">
                    {COMPANY.phone}
                  </a>{" "}
                  bize ulaşın.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-violet-600" />
                <span>{PAYMENT_APPROVAL_NOTICE}</span>
              </p>
            </div>

            {/* iyzico üye iş yeri şartı: ödemenin başlatıldığı ekranda iyzico,
                Visa ve Mastercard logoları ile sözleşme bağlantıları görünmeli. */}
            <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
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

            <Button variant="outline" className="rounded-full" asChild>
              <Link href={dashboardHref}>Panele git</Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
