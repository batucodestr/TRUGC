import { Suspense } from "react";
import { PosReturnView } from "@/features/campaigns/pos-return-view";
import { Logo } from "@/components/shared/logo";

export const metadata = { title: "Ödeme Sonucu — TRUGC" };

/** Sanal POS'tan dönüş sayfası (POS_RETURN_URL bu adresi gösterir). */
export default function PaymentReturnPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <Suspense>
        <PosReturnView />
      </Suspense>
    </div>
  );
}
