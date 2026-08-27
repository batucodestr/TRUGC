import { CreatorManagementTable } from "@/features/admin/creator-management-table";

export default function AdminCreatorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Creator yönetimi</h1>
        <p className="text-muted-foreground">Tüm creator profillerini arayın, onaylayın ve yönetin.</p>
      </div>
      <CreatorManagementTable />
    </div>
  );
}
