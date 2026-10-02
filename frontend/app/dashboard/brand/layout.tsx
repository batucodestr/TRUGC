import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotifications } from "@/lib/api/notifications";
import { getOnboardingStatusSafe } from "@/lib/api/onboarding";

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  // Zorunlu akış (e-posta doğrulama + profil fotoğrafı) tamamlanmadan marka
  // paneline girilmez. Bu yalnızca kullanıcıyı doğru ekrana götüren bir
  // kolaylıktır; iş verme/iş alma uçlarındaki gerçek engel backend'deki izin
  // sınıflarıdır (apps/accounts/permissions.py::IsOnboarded). Durum okunamazsa
  // (ör. bayat access cookie'si) akış tamamlanmış sayılır — mevcut kullanıcıyı
  // bir ağ hatası yüzünden kurulum ekranına kilitlemek kabul edilemez.
  const [notifications, onboarding] = await Promise.all([listNotifications(), getOnboardingStatusSafe()]);

  if (!onboarding.complete) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell role="brand" notifications={notifications}>
      {children}
    </DashboardShell>
  );
}
