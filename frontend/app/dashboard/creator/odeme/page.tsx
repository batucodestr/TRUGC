import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentCheckout } from "@/features/payments/payment-checkout";

export const metadata = { title: "Ödeme — TRUGC" };

/**
 * Başvuru sonrası ödeme ekranı.
 *
 * Creator kampanyaya başvurduğunda buraya yönlendirilir (bkz.
 * features/campaigns/apply-campaign-dialog.tsx). Zaten aktif paketi olan
 * kullanıcı burada ödeme değil, başvurusunun alındığını görür — ekranın
 * hangi hâli gösterileceğine bileşen, sunucudan okuduğu paket durumuna
 * göre karar verir.
 *
 * `searchParams` ile gelen başvuru kimliği ve kampanya adı yalnızca bağlam
 * göstermek içindir; tutar her zaman katalogdan, onay ise admin tarafından
 * gelir.
 */
export default function CreatorPaymentPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <PaymentCheckout />
    </Suspense>
  );
}
