import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicantRow } from "@/features/brands/applicant-row";
import { EmptyState } from "@/components/shared/empty-state";
import { listApplications } from "@/lib/api/applications";
import type { ApplicationStatus } from "@/types";

const TABS: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "pending", label: "Beklemede" },
  { value: "accepted", label: "Kabul edildi" },
  { value: "rejected", label: "Reddedildi" },
  { value: "withdrawn", label: "Geri çekildi" },
];

export default async function BrandApplicationsPage() {
  // GET /applications/ is already scoped server-side to the current user
  // (ApplicationViewSet.get_queryset filters to campaign__brand__user=request.user
  // for brand accounts), so no client-side brand-id filtering is needed here.
  const applications = await listApplications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Başvurular</h1>
        <p className="text-muted-foreground">Tüm kampanyalarınızda {applications.length} başvuru</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const list = tab.value === "all" ? applications : applications.filter((a) => a.status === tab.value);
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-6 space-y-3">
              {list.length === 0 ? (
                <EmptyState icon={FileText} title="Burada başvuru yok" description="Bu filtreye uyan bir kayıt henüz yok." />
              ) : (
                list.map((app) => <ApplicantRow key={app.id} application={app} />)
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
