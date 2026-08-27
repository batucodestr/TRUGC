import Link from "next/link";
import Image from "next/image";
import { Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CampaignStatusBadge } from "@/features/campaigns/campaign-status-badge";
import { CampaignRowActions } from "@/features/brands/campaign-row-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { listMyCampaigns } from "@/lib/api/campaigns";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function ManageCampaignsPage() {
  const campaigns = await listMyCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kampanyaları yönet</h1>
          <p className="text-muted-foreground">Toplam {campaigns.length} kampanya</p>
        </div>
        <Button className="gap-2 rounded-full bg-gradient-brand hover:opacity-90" asChild>
          <Link href="/dashboard/brand/campaigns/new">
            <Plus className="h-4 w-4" /> Yeni kampanya
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Henüz kampanya yok"
          description="Creator'lardan başvuru almaya başlamak için ilk kampanyanızı yayınlayın."
          action={
            <Button className="rounded-full bg-gradient-brand hover:opacity-90" asChild>
              <Link href="/dashboard/brand/campaigns/new">Kampanya oluştur</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden rounded-2xl border-border/70 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kampanya</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Bütçe</TableHead>
                  <TableHead>Başvuranlar</TableHead>
                  <TableHead>Son tarih</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link href={`/dashboard/brand/campaigns/${campaign.slug}`} className="flex items-center gap-3">
                        <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {campaign.coverUrl && <Image src={campaign.coverUrl} alt={campaign.title} fill sizes="56px" className="object-cover" />}
                        </div>
                        <span className="max-w-[220px] truncate font-medium hover:text-violet-600">{campaign.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(campaign.budgetMin)}–{formatCurrency(campaign.budgetMax)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{campaign.applicantsCount ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(campaign.applicationDeadline)}</TableCell>
                    <TableCell>
                      <CampaignRowActions campaignId={campaign.id} slug={campaign.slug} status={campaign.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
