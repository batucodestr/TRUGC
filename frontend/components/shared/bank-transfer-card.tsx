// Havale/EFT ödeme bilgileri kutusu.
//
// Sanal POS açılana kadar ödemelerin alındığı kanal budur; IBAN'ın yanlış
// kopyalanması ödemenin kaybolması demek olduğundan değerler CopyField ile
// tek dokunuşta kopyalanır. Paket seçiminde aynı bilgiler
// PackageCheckoutDialog içinde tutarla birlikte gösterilir.

import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/shared/copy-field";
import { BANK_ACCOUNT, COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

export function BankTransferCard({ className }: { className?: string }) {
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

      <div className="mt-5 space-y-3">
        <CopyField label="Hesap adı" value={BANK_ACCOUNT.accountName} mono={false} />
        <CopyField label="Şirket IBAN" value={BANK_ACCOUNT.iban} copyValue={BANK_ACCOUNT.ibanPlain} />
      </div>

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
