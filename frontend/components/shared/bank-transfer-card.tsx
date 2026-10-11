"use client";

// Havale/EFT ödeme bilgileri kutusu.
//
// Sanal POS açılana kadar ödemelerin alındığı kanal budur; IBAN'ın yanlış
// kopyalanması ödemenin kaybolması demek olduğundan tek dokunuşluk bir
// "kopyala" düğmesi vardır (bu yüzden bileşen istemci tarafındadır).

import { useState } from "react";
import { Building2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BANK_ACCOUNT, COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

export function BankTransferCard({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyIban() {
    try {
      await navigator.clipboard.writeText(BANK_ACCOUNT.ibanPlain);
      setCopied(true);
      toast.success("IBAN kopyalandı");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard izni yoksa kullanıcı numarayı elle seçebilir.
      toast.error("IBAN kopyalanamadı, numarayı elle kopyalayabilirsiniz.");
    }
  }

  return (
    <Card className={cn("rounded-3xl border-border/70 p-7 shadow-sm", className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/25">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Havale / EFT ile ödeme</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Üyelik paketinizi şirket hesabımıza havale/EFT ile de ödeyebilirsiniz. Açıklama alanına TRUGC
            kullanıcı adınızı yazmanız, ödemenin hesabınıza hızlıca tanımlanmasını sağlar.
          </p>
        </div>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Hesap adı</dt>
          <dd className="font-medium">{BANK_ACCOUNT.accountName}</dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="text-xs text-muted-foreground">Şirket IBAN</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span className="select-all break-all font-mono text-sm font-medium tracking-tight">
              {BANK_ACCOUNT.iban}
            </span>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 rounded-full" onClick={copyIban}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Kopyalandı" : "Kopyala"}
            </Button>
          </dd>
        </div>
      </dl>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Ödemeniz ekibimiz tarafından kontrol edildikten sonra paketiniz hesabınıza tanımlanır. Dekontunuzu{" "}
        <a href={`mailto:${COMPANY.email}`} className="font-medium text-foreground underline underline-offset-4">
          {COMPANY.email}
        </a>{" "}
        adresine gönderebilir veya çağrı destek hattımızdan{" "}
        <a href={`tel:${COMPANY.phoneHref}`} className="font-medium text-foreground underline underline-offset-4">
          {COMPANY.phone}
        </a>{" "}
        bize ulaşabilirsiniz.
      </p>
    </Card>
  );
}
