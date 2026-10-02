import { OnboardingView } from "@/features/auth/onboarding-view";
import { Logo } from "@/components/shared/logo";

export const metadata = { title: "Hesabınızı Tamamlayın — TRUGC" };

/**
 * Zorunlu kullanıcı akışı: kayıt → e-posta doğrulama → profil fotoğrafı → kullanım.
 *
 * Bilinçli olarak /dashboard dışında yaşar: dashboard layout'ları akış
 * tamamlanmadığında buraya yönlendirir, dolayısıyla bu sayfanın kendisi o
 * yönlendirmenin kapsamında olmamalıdır (sonsuz döngü olurdu).
 */
export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <OnboardingView />
    </div>
  );
}
