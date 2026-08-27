import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotifications } from "@/lib/api/notifications";
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";

// Moderators and full admins share this same panel, but a moderator (is_staff
// without is_superuser) doesn't get the most sensitive modules — those
// backend endpoints (system status, roles/permissions, audit log) are
// IsAdminRole-only, not IsAdminRole|IsModerator, so hiding them here just
// keeps the sidebar honest about what a moderator can actually reach.
const SUPERUSER_ONLY_HREFS = ["/manage/system", "/manage/roles", "/manage/logs"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [notifications, me] = await Promise.all([
    listNotifications(),
    apiClient.get<{ is_superuser: boolean }>(AUTH_ENDPOINTS.me),
  ]);

  return (
    <DashboardShell role="admin" notifications={notifications} hiddenNavHrefs={me.is_superuser ? [] : SUPERUSER_ONLY_HREFS}>
      {children}
    </DashboardShell>
  );
}
