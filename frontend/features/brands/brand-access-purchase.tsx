"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePricing } from "@/components/Pricing/PricingProvider";
import { startBrandAccessCheckout } from "@/lib/api/finance";
import { getErrorMessage } from "@/lib/error-message";
import { formatCurrency } from "@/lib/format";
import { PaymentMethods } from "@/components/shared/payment-methods";
import { Checkbox } from "@/components/ui/checkbox";

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
  // iyzico üye iş yeri şartı: ödeme başlatılmadan önce alıcının mesafeli
  // satış sözleşmesini ve ön bilgilendirmeyi açıkça onaylaması gerekir.
  const [consented, setConsented] = useState(false);

  async function handlePurchase() {
    if (!consented) {
      toast.error("Onay gerekli", {
        description: "Devam etmek için mesafeli satış sözleşmesini ve teslimat/iade koşullarını onaylayın.",
      });
      return;
    }
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
      <CardContent className="flex flex-col gap-4 px-5 py-5">
        <div>
          <p className="text-sm text-muted-foreground">Creator erişim paketi</p>
          <p className="mt-1 text-sm font-medium">
            {plan?.purchasable
              ? `${formatCurrency(price)} · ${plan.days} gün`
              : posReady
                ? "Paket fiyatı tanımlı değil"
                : "Sanal POS henüz yapılandırılmadı"}
          </p>
          {plan?.purchasable && <p className="mt-0.5 text-xs text-muted-foreground">KDV dahil, Türk Lirası (TL)</p>}
        </div>

        {plan?.purchasable ? (
          <>
            <div className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
              <Checkbox
                id="access-consent"
                checked={consented}
                onCheckedChange={(value) => setConsented(value === true)}
                className="mt-0.5"
              />
              <span>
                <Link href="/mesafeli-satis-sozlesmesi" className="font-medium text-foreground underline underline-offset-4">
                  Mesafeli satış sözleşmesini
                </Link>{" "}
                ve{" "}
                <Link href="/teslimat-ve-iade" className="font-medium text-foreground underline underline-offset-4">
                  teslimat ve iade koşullarını
                </Link>{" "}
                <label htmlFor="access-consent" className="cursor-pointer">
                  okudum, onaylıyorum.
                </label>
              </span>
            </div>
            <Button
              onClick={handlePurchase}
              disabled={starting || !consented}
              size="sm"
              className="gap-2 self-start rounded-full bg-gradient-brand hover:opacity-90"
            >
              {starting ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Erişim satın al
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ödeme altyapısı tamamlandığında bu paketi doğrudan buradan satın alabileceksiniz. Şimdilik erişiminiz için
            bizimle iletişime geçin.
          </p>
        )}

        {/* iyzico üye iş yeri şartı: ödemenin başlatıldığı ekranda iyzico,
            Visa ve Mastercard logoları ile iade koşulları bağlantısı
            görünür olmalıdır. */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
          <PaymentMethods showNote={false} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ödemeler 3D Secure ile alınır; kart bilgileriniz TRUGC sunucularında saklanmaz.{" "}
            <Link href="/teslimat-ve-iade" className="underline underline-offset-4 hover:text-foreground">
              Teslimat ve iade koşulları
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
