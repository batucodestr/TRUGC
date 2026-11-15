"use client";

// "Paketi Seç" → doğrudan panelin ödeme ekranı (PayTR iframe).
//
// Eskiden burada IBAN'lı bir pencere açılıyordu; kullanıcı panele geçince
// bambaşka bir ekranla (iframe) karşılaşıyordu. Artık "Paketi Seç" kullanıcıyı
// seçtiği paketle panelin ödeme ekranına götürür ve kartlı ödeme (iframe)
// otomatik açılır. Havale/EFT, o ekranda ayrı bir düğmedir.
//
// Dosya adı geriye dönük uyum için korunmuştur.

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/Auth/AuthProvider";
import type { CheckoutTier, PackageAudience } from "@/lib/content/packages";

interface PackageCheckoutDialogProps {
  /** Sunucudaki paket kodu (package_code). */
  packageCode: string;
  packageName: string;
  audience: PackageAudience;
  options: CheckoutTier[];
  /** Kullanıcının ödemeye devam edeceği panel ödeme sayfası. */
  dashboardHref: string;
  triggerClassName?: string;
  triggerVariant?: "default" | "outline";
}

const AUDIENCE_LABEL: Record<PackageAudience, string> = { creator: "creator", brand: "marka" };

export function PackageCheckoutDialog({
  packageCode,
  audience,
  options,
  dashboardHref,
  triggerClassName,
  triggerVariant = "outline",
}: PackageCheckoutDialogProps) {
  const router = useRouter();
  const { session, loading } = useAuth();

  function choose() {
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.user.role !== audience) {
      toast.info(`Bu paket ${AUDIENCE_LABEL[audience]} hesapları içindir.`);
      return;
    }
    // Varsayılan olarak en uzun (en avantajlı) süre; ödeme ekranında değiştirilebilir.
    const tier = options[options.length - 1]!;
    router.push(`${dashboardHref}?package=${encodeURIComponent(packageCode)}&tier=${encodeURIComponent(tier.code)}&pay=1`);
  }

  return (
    <Button variant={triggerVariant} className={triggerClassName} onClick={choose} disabled={loading}>
      Paketi Seç
    </Button>
  );
}
