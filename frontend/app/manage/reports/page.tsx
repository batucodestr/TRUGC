import { ReportsTable } from "@/features/admin/reports-table";
import { listReports } from "@/lib/api/reports";

export default async function AdminReportsPage() {
  const reports = await listReports();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Raporlar</h1>
        <p className="text-muted-foreground">Moderasyon gerektiren, kullanıcılar tarafından gönderilmiş raporlar.</p>
      </div>
      <ReportsTable reports={reports} />
    </div>
  );
}
