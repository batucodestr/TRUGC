import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotifications } from "@/lib/api/notifications";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const notifications = await listNotifications();
  return (
    <DashboardShell role="creator" notifications={notifications}>
      {children}
    </DashboardShell>
  );
}
