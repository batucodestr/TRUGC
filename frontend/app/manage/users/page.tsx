import { UserManagementTable } from "@/features/admin/user-management-table";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kullanıcı yönetimi</h1>
        <p className="text-muted-foreground">Platformdaki tüm hesapları arayın, filtreleyin ve yönetin.</p>
      </div>
      <UserManagementTable />
    </div>
  );
}
