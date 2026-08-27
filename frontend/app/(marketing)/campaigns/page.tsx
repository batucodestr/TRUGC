import { CampaignBrowser } from "@/features/campaigns/campaign-browser";
import { listCampaigns } from "@/lib/api/campaigns";

export const metadata = { title: "Kampanyaları Keşfet — TRUGC" };

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();
  return <CampaignBrowser campaigns={campaigns} />;
}
