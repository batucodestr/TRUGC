import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listNotifications } from "@/lib/api/notifications";
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";

// Moderatörler ve tam adminler bu aynı paneli paylaşır, ancak bir moderatör
// (is_superuser olmadan is_staff) en hassas modüllere erişemez — o backend
// endpoint'leri (sistem durumu, roller/yetkiler, denetim kaydı)
// IsAdminRole|IsModerator değil, yalnızca IsAdminRole'dür; bu yüzden onları
// burada gizlemek, kenar çubuğunun bir moderatörün gerçekten neye
// ulaşabildiği konusunda dürüst kalmasını sağlar.
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
