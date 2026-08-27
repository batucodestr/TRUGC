import Image from "next/image";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/features/campaigns/campaign-status-badge";
import { ApplicantRow } from "@/features/brands/applicant-row";
import { EmptyState } from "@/components/shared/empty-state";
import { getCampaign } from "@/lib/api/campaigns";
import { listApplicationsForCampaign } from "@/lib/api/applications";
import { formatCurrency } from "@/lib/format";

export default async function BrandCampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) notFound();

  const applications = await listApplicationsForCampaign(campaign.id);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border-border/70 p-0">
        <div className="relative h-40 w-full bg-muted">
          {campaign.coverUrl && <Image src={campaign.coverUrl} alt={campaign.title} fill sizes="100vw" className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
            <div>
              <CampaignStatusBadge status={campaign.status} className="mb-2" />
              <h1 className="text-xl font-semibold text-white">{campaign.title}</h1>
            </div>
            <span className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold">
              {formatCurrency(campaign.budgetMin)}–{formatCurrency(campaign.budgetMax)}
            </span>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Başvuranlar ({applications.length})</h2>
        {applications.length === 0 ? (
          <EmptyState icon={Users} title="Henüz başvuran yok" description="Creator'lar bu kampanyaya başvurdukça burada listelenecek." />
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <ApplicantRow key={app.id} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
