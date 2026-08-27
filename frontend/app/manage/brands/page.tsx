import { BrandManagementTable } from "@/features/admin/brand-management-table";

export default function AdminBrandsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marka yönetimi</h1>
        <p className="text-muted-foreground">Tüm marka profillerini arayın, onaylayın ve yönetin.</p>
      </div>
      <BrandManagementTable />
    </div>
  );
}
