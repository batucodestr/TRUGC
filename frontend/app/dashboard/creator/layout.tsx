import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotifications } from "@/lib/api/notifications";
import { getOnboardingStatusSafe } from "@/lib/api/onboarding";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  // Bkz. app/dashboard/brand/layout.tsx — aynı zorunlu akış kontrolü.
  const [notifications, onboarding] = await Promise.all([listNotifications(), getOnboardingStatusSafe()]);

  if (!onboarding.complete) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell role="creator" notifications={notifications}>
      {children}
    </DashboardShell>
  );
}
