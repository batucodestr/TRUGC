// API layer for the moderation report queue. Mirrors
// backend/apps/reports/serializers.py exactly.
import { apiClient } from "@/lib/api";
import { ENDPOINTS, reportResolve } from "@/lib/endpoints";

export type ReportTargetType = "creator" | "brand" | "campaign" | "message";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface Report {
  id: number;
  reporter_email: string;
  target_type: ReportTargetType;
  target_id: number;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by_email: string | null;
  resolution_notes: string;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** File a report against a creator/brand profile or a campaign. Any authenticated user can call this. */
export async function createReport(targetType: ReportTargetType, targetId: number | string, reason: string): Promise<Report> {
  return apiClient.post(ENDPOINTS.reports, { target_type: targetType, target_id: Number(targetId), reason });
}

/** Moderator/admin-only: the full report queue. */
export async function listReports(): Promise<Report[]> {
  const data = await apiClient.get<Paginated<Report>>(ENDPOINTS.reports);
  return data.results;
}

/** Moderator/admin-only: mark a report resolved or dismissed. */
export async function resolveReport(id: number | string, status: "resolved" | "dismissed", notes?: string): Promise<Report> {
  return apiClient.post(reportResolve(id), { status, notes });
}
