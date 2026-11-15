import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

// Şekiller, backend/apps/analytics/serializers.py'yi tam olarak yansıtır
// (BrandDashboardSerializer / CreatorDashboardSerializer / AdminDashboardSerializer).

export interface BrandDashboard {
  active_campaigns: number;
  total_campaigns: number;
  total_applicants: number;
  accepted_applicants: number;
  total_budget_committed: number;
  average_rating: number;
  estimated_reach: number;
  reach_series: { date: string; reach: number }[];
  applicants_trend_pct: number | null;
  accepted_trend_pct: number | null;
  active_campaigns_delta: number;
}

export interface CreatorDashboard {
  collaborations: number;
  total_applications_sent: number;
  profile_views: number;
  earnings: number;
  total_followers: number;
  average_engagement_rate: number;
  average_rating: number;
  active_collaborations: number;
  total_reach: number;
  earnings_this_month: number;
  earnings_trend_pct: number | null;
  monthly_earnings: { month: string; total: number }[];
  applications_trend_pct: number | null;
  profile_completion: { percent: number; basic: boolean; social: boolean; portfolio: boolean; stats: boolean };
}

export interface AdminDashboard {
  total_users: number;
  total_creators: number;
  total_brands: number;
  total_campaigns: number;
  published_campaigns: number;
  total_applications: number;
  pending_verifications: number;
  new_reports: number;
  today_registrations: number;
  last_24h_logins: number;
  registration_trend: { date: string; count: number }[];
  campaign_status_breakdown: Record<string, number>;
  application_status_breakdown: Record<string, number>;
  top_categories: { name: string; count: number }[];
}

export async function getBrandDashboard(): Promise<BrandDashboard> {
  return apiClient.get(ENDPOINTS.analytics.brand);
}

export async function getCreatorDashboard(): Promise<CreatorDashboard> {
  return apiClient.get(ENDPOINTS.analytics.creator);
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return apiClient.get(ENDPOINTS.analytics.admin);
}
