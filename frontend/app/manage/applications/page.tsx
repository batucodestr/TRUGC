import { ApplicationManagementTable } from "@/features/admin/application-management-table";

export default function AdminApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Başvuru yönetimi</h1>
        <p className="text-muted-foreground">Tüm platformdaki başvuruları tek ekrandan onaylayın, reddedin veya bekletin.</p>
      </div>
      <ApplicationManagementTable />
    </div>
  );
}
