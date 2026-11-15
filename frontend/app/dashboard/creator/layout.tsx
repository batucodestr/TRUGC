import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotifications } from "@/lib/api/notifications";
import { getOnboardingStatusSafe } from "@/lib/api/onboarding";
import { getNavBadges } from "@/lib/api/nav-badges";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  // Bkz. app/dashboard/brand/layout.tsx — aynı zorunlu akış kontrolü.
  const [notifications, onboarding, badges] = await Promise.all([
    listNotifications(),
    getOnboardingStatusSafe(),
    getNavBadges("creator"),
  ]);

  if (!onboarding.complete) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell role="creator" notifications={notifications} badges={badges}>
      {children}
    </DashboardShell>
  );
}
