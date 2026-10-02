"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePricing } from "@/components/Pricing/PricingProvider";
import { startBrandAccessCheckout } from "@/lib/api/finance";
import { getErrorMessage } from "@/lib/error-message";
import { formatCurrency } from "@/lib/format";

/**
 * Marka creator erişim paketi: sanal POS ile satın alma kutusu.
 *
 * Hafta sonu (ücretsiz dönem) satın alma hiç gösterilmez — erişim zaten
 * ücretsizdir ve backend ödeme uçlarını kapatır. Ücretli dönemde POS
 * yapılandırılmamışsa, kullanıcıya sessiz bir hata yerine ne yapması
 * gerektiğini söyleyen bir not gösterilir.
 */
export function BrandAccessPurchase() {
  const { state, loading, isFree } = usePricing();
  const [starting, setStarting] = useState(false);

  async function handlePurchase() {
    setStarting(true);
    try {
      const checkout = await startBrandAccessCheckout();
      if (checkout.mode === "redirect" && checkout.redirect_url) {
        // Kart bilgileri yalnızca sağlayıcının 3D Secure sayfasında girilir.
        window.location.assign(checkout.redirect_url);
        return;
      }
      if (checkout.mode === "html" && checkout.form_html) {
        // Bazı sağlayıcılar yönlendirme yerine gömülebilir form döner; formu
        // kendi içinde submit eden bir belgeye yazarız.
        const frame = document.createElement("div");
        frame.innerHTML = checkout.form_html;
        document.body.appendChild(frame);
        frame.querySelector("form")?.submit();
        return;
      }
      toast.error("Ödeme sayfası açılamadı", { description: "Lütfen birazdan tekrar deneyin." });
    } catch (err) {
      toast.error("Ödeme başlatılamadı", { description: getErrorMessage(err) });
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardContent className="flex items-center justify-center px-5 py-7 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (isFree) {
    return (
      <Card className="rounded-2xl border-emerald-500/30 bg-emerald-50/60 shadow-sm dark:bg-emerald-500/10">
        <CardContent className="flex items-start gap-3 px-5 py-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Hafta sonu ücretsiz</p>
            <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
              Creator erişimi ve kampanya işlemleri bu süreçte ücretsizdir; ödeme alınmaz.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const plan = state?.brand_access_plan;
  const posReady = Boolean(state?.pos.available);
  const price = plan ? Number(plan.price) : 0;

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Creator erişim paketi</p>
          <p className="mt-1 text-sm font-medium">
            {plan?.purchasable
              ? `${formatCurrency(price)} · ${plan.days} gün`
              : posReady
                ? "Paket fiyatı tanımlı değil"
                : "Sanal POS henüz yapılandırılmadı"}
          </p>
        </div>
        {plan?.purchasable ? (
          <Button onClick={handlePurchase} disabled={starting} size="sm" className="gap-2 rounded-full bg-gradient-brand hover:opacity-90">
            {starting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            Erişim satın al
          </Button>
        ) : (
          <p className="max-w-xs text-xs text-muted-foreground">
            Ödeme altyapısı tamamlandığında bu paketi doğrudan buradan satın alabileceksiniz. Şimdilik erişiminiz için
            bizimle iletişime geçin.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
