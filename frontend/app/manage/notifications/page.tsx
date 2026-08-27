import { NotificationBroadcastForm } from "@/features/admin/notification-broadcast-form";

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bildirim yönetimi</h1>
        <p className="text-muted-foreground">Bir role veya tüm kullanıcılara sistem bildirimi gönderin — anında veya planlanmış olarak.</p>
      </div>
      <NotificationBroadcastForm />
    </div>
  );
}
