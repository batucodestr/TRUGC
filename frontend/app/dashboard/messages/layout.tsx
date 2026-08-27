import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotifications } from "@/lib/api/notifications";
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";
import type { UserRole } from "@/types";

// /dashboard/messages is shared by both brand and creator accounts (unlike
// /dashboard/brand and /dashboard/creator, which each know their own role
// statically). Hardcoding role="creator" here made DashboardShell render the
// CREATOR_NAV sidebar even for brand users — the "panel suddenly shows
// different content" bug. The role has to come from the actual signed-in
// user, fetched server-side, not assumed.
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const [notifications, me] = await Promise.all([
    listNotifications(),
    apiClient.get<{ role: UserRole }>(AUTH_ENDPOINTS.me),
  ]);
  return (
    <DashboardShell role={me.role} notifications={notifications} title="Mesajlar">
      {children}
    </DashboardShell>
  );
}
