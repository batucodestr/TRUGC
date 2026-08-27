import { AdminLogList } from "@/features/admin/admin-log-list";

export default function AdminLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log merkezi</h1>
        <p className="text-muted-foreground">Admin işlemleri, rol değişiklikleri, ban ve silme işlemlerinin denetim kaydı.</p>
      </div>
      <AdminLogList />
    </div>
  );
}
