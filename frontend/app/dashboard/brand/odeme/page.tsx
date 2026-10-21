import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentCheckout } from "@/features/payments/payment-checkout";

export const metadata = { title: "Üyelik paketi — TRUGC" };

/**
 * Marka üyelik paketi ödeme ekranı.
 *
 * Markanın paketini aktifleştirebileceği tek yer burasıdır: kampanya hakkı
 * bitince (`create-campaign-form` → 402) ve panodaki paket kartından buraya
 * yönlendirilir. Ekran yalnızca **marka** paketlerini listeler; creator
 * fiyatları marka panelinde hiç görünmez (aynı kuralı sunucu da uygular,
 * bkz. apps/payments/declarations.py → kitle kontrolü).
 *
 * Kampanya bütçelerinin ödemesi bundan ayrıdır ve /dashboard/brand/payments
 * altında yaşar — burada satılan şey üyelik paketidir.
 */
export default function BrandPaymentPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <PaymentCheckout audience="brand" />
    </Suspense>
  );
}
