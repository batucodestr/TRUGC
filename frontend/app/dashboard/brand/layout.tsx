import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotifications } from "@/lib/api/notifications";

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const notifications = await listNotifications();
  return (
    <DashboardShell role="brand" notifications={notifications}>
      {children}
    </DashboardShell>
  );
}
