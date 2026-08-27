import { RoleManagement } from "@/features/admin/role-management";

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roller & Yetkiler</h1>
        <p className="text-muted-foreground">Django Groups üzerinden rollerin yetkilerini yönetin, yeni roller ekleyin.</p>
      </div>
      <RoleManagement />
    </div>
  );
}
