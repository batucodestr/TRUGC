import { CampaignManagementTable } from "@/features/admin/campaign-management-table";

export default function AdminCampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kampanya yönetimi</h1>
        <p className="text-muted-foreground">Tüm markalardaki kampanyaları arayın, filtreleyin ve toplu yönetin.</p>
      </div>
      <CampaignManagementTable />
    </div>
  );
}
