"use client";

// "Paketi Seç" → ödeme bilgileri.
//
// Kullanıcı paketi seçtiğinde panele yönlendirilmek yerine ödeme bilgilerini
// doğrudan burada görür: seçtiği süre, ödenecek tutar, şirket IBAN'ı ve
// havale açıklamasına ne yazması gerektiği.
//
// Sanal POS henüz yapılandırılmadığı için (bkz. GET /payments/pricing/ →
// pos.configured) aktif tahsilat kanalı havale/EFT'tir. POS açıldığında bu
// diyaloğa "Kartla öde" düğmesi eklenir; o güne kadar kullanıcıya çalışmayan
// bir kart akışı gösterilmez.

import { useState } from "react";
import Link from "next/link";
import { Banknote, Check, Clock, Info } from "lucide-react";
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
import { BANK_ACCOUNT, COMPANY } from "@/lib/company";
import { formatTryPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CheckoutOption {
  id: string;
  /** "3 Günlük" / "Haftalık" / "Aylık" */
  label: string;
  price: number;
  /** Süreye bağlı ek bilgi, ör. "10 iş başvuru hakkı". */
  note?: string;
}

interface PackageCheckoutDialogProps {
  packageName: string;
  options: CheckoutOption[];
  /** Ödeme sonrası kullanıcının devam edeceği panel. */
  dashboardHref: string;
  triggerClassName?: string;
  triggerVariant?: "default" | "outline";
}

export function PackageCheckoutDialog({
  packageName,
  options,
  dashboardHref,
  triggerClassName,
  triggerVariant = "outline",
}: PackageCheckoutDialogProps) {
  // Birden fazla süre varsa varsayılan olarak en uzunu (en avantajlısı) seçili
  // gelir — kullanıcı diyalog içinde değiştirebilir.
  const [selectedId, setSelectedId] = useState(options[options.length - 1]!.id);
  const selected = options.find((option) => option.id === selectedId) ?? options[0]!;
  const reference = `TRUGC ${packageName} ${selected.label}`;

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
            Paketinizi aktifleştirmek için aşağıdaki hesaba ödeme yapın; ödemeniz onaylandığında paket hesabınıza
            tanımlanır.
          </DialogDescription>
        </DialogHeader>

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
          <p className="mt-1 text-xs text-muted-foreground">KDV dahil, Türk Lirası (TL)</p>
        </div>

        {/* Havale/EFT — şu anki aktif tahsilat kanalı */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/25">
              <Banknote className="size-4.5" />
            </span>
            <h3 className="text-sm font-semibold">Havale / EFT ile ödeme</h3>
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
            <span>Ödemeler {COMPANY.supportHours} saatleri içinde kontrol edilir ve paketiniz tanımlanır.</span>
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
      </DialogContent>
    </Dialog>
  );
}
