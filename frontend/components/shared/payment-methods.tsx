import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * "iyzico ile Öde" + kabul edilen kart şemalarının logo bandı.
 *
 * iyzico üye iş yeri başvurusu, ödeme alınan sitede iyzico logosunun ve
 * desteklenen kart şemalarının (Visa, Mastercard) görünür olmasını şart
 * koşar. Bu yüzden band hem herkese açık sayfaların altbilgisinde hem de
 * ödemenin başladığı yerlerde (fiyatlandırma, marka ödeme paneli) gösterilir.
 *
 * Logolar `public/payment/` altında kendi sunucumuzdan verilir; dış kaynaktan
 * çekilmez (CSP ve kullanılabilirlik). `unoptimized`, next/image'ın SVG'leri
 * optimizasyon hattına sokmaması içindir — SVG için `dangerouslyAllowSVG`
 * gerekir ve yalnızca bu band uğruna açılmaz.
 */
const CARD_SCHEMES = [
  { src: "/payment/visa.svg", alt: "Visa", width: 1000, height: 325, className: "h-4 w-auto" },
  { src: "/payment/mastercard.svg", alt: "Mastercard", width: 999, height: 776, className: "h-6 w-auto" },
] as const;

interface PaymentMethodsProps {
  className?: string;
  /** 3D Secure açıklama satırını gizlemek için false verin. */
  showNote?: boolean;
}

export function PaymentMethods({ className, showNote = true }: PaymentMethodsProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Logolar renkli ve koyu; koyu temada kaybolmamaları için her biri
            beyaz bir yongaya oturur (iyzico'nun logo kullanım kuralı da
            logonun açık zemin üzerinde gösterilmesini ister). */}
        <span className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 shadow-sm">
          <Image src="/payment/iyzico.svg" alt="iyzico" width={104} height={37} unoptimized className="h-5 w-auto" />
          <span className="text-sm font-semibold leading-none text-[#1e64ff]">ile Öde</span>
        </span>
        {CARD_SCHEMES.map((logo) => (
          <span
            key={logo.alt}
            className="inline-flex h-[37px] items-center justify-center rounded-xl border border-black/10 bg-white px-3 shadow-sm"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              unoptimized
              className={logo.className}
            />
          </span>
        ))}
      </div>
      {showNote && (
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Tüm ödemeler iyzico güvenli ödeme altyapısı üzerinden, 3D Secure doğrulamasıyla alınır. Kart bilgileriniz
          yalnızca iyzico&apos;nun ödeme sayfasına girilir ve TRUGC sunucularında saklanmaz.
        </p>
      )}
    </div>
  );
}
