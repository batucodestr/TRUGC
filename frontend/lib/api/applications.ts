// Başvurular için API katmanı. Gerçek Django `ApplicationViewSet`'ini (`/api/v1/applications/`) okur/yazar.
import { apiClient } from "@/lib/api";
import { ENDPOINTS, applicationDetail } from "@/lib/endpoints";
import type { Application, ApplicationStatus } from "@/types";

// ---------------------------------------------------------------------------
// Gerçek API şekilleri (apps/applications/serializers.py ApplicationSerializer'ı yansıtır)
// ---------------------------------------------------------------------------

interface RawApplication {
  id: number;
  /** Creator profilinin kimliği — /creators/<id> bağlantısı için. */
  creator_id: number | null;
  /** Creator'ın KULLANICI kimliği — konuşma açmak için gereken budur. */
  creator_user_id: number | null;
  creator_name: string;
  creator_avatar: string | null;
  /** Kampanya kimliği (okuma). `campaign_id` yazma amaçlıdır, okumada dönmez. */
  campaign: number | null;
  campaign_title: string;
  brand_id: number;
  brand_name: string | null;
  /** Markanın KULLANICI kimliği — creator'ın markaya mesaj atabilmesi için. */
  brand_user_id: number | null;
  message: string;
  proposed_rate: string | null;
  status: string;
  awaiting_payment?: boolean;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function unwrap<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

function normalizeApplication(raw: RawApplication): Application {
  return {
    id: String(raw.id),
    campaignId: raw.campaign != null ? String(raw.campaign) : undefined,
    campaignTitle: raw.campaign_title,
    campaignCoverUrl: undefined,
    creatorId: raw.creator_id != null ? String(raw.creator_id) : undefined,
    creatorUserId: raw.creator_user_id != null ? String(raw.creator_user_id) : undefined,
    creatorName: raw.creator_name,
    creatorAvatarUrl: raw.creator_avatar ?? undefined,
    brandId: String(raw.brand_id),
    brandName: raw.brand_name ?? undefined,
    brandUserId: raw.brand_user_id != null ? String(raw.brand_user_id) : undefined,
    status: raw.status as ApplicationStatus,
    awaitingPayment: raw.awaiting_payment ?? false,
    proposedPrice: raw.proposed_rate != null ? Number(raw.proposed_rate) : undefined,
    message: raw.message,
    appliedAt: raw.created_at,
    updatedAt: raw.updated_at,
    reviewedAt: raw.reviewed_at ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Okumalar
// ---------------------------------------------------------------------------

/** Every application visible to the current user — ApplicationViewSet already scopes this to
 * the logged-in creator's own applications, or a brand's applications to their own campaigns. */
export async function listApplications(): Promise<Application[]> {
  const data = await apiClient.get<Paginated<RawApplication>>(ENDPOINTS.applications);
  return unwrap(data).map(normalizeApplication);
}

/** Applications for one campaign (brand viewing applicants). Uses the server-side `?campaign=` filter. */
export async function listApplicationsForCampaign(campaignId: string): Promise<Application[]> {
  const endpoint = `${ENDPOINTS.applications}?campaign=${encodeURIComponent(campaignId)}`;
  const data = await apiClient.get<Paginated<RawApplication>>(endpoint);
  return unwrap(data).map(normalizeApplication);
}

/** Applications for the currently logged-in creator. */
export async function listMyApplications(): Promise<Application[]> {
  return listApplications();
}

/** /manage applications list — real server-side pagination + count. */
export async function listApplicationsPaginated(params: { page?: number; status?: ApplicationStatus } = {}): Promise<{
  applications: Application[];
  count: number;
}> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  if (params.status) qs.set("status", params.status);
  const data = await apiClient.get<Paginated<RawApplication>>(`${ENDPOINTS.applications}?${qs.toString()}`);
  return { applications: data.results.map(normalizeApplication), count: data.count };
}

// ---------------------------------------------------------------------------
// Yazmalar
// ---------------------------------------------------------------------------

export interface ApplyInput {
  campaignId: string;
  message: string;
  proposedRate?: number;
}

/** Creator applies to a campaign. POSTs `campaign_id` (the serializer's write-only field name). */
/**
 * Kampanyaya başvurur.
 *
 * Uç idempotenttir: aynı kampanyaya ikinci kez başvurmak hata değildir, var
 * olan başvuru döner (bkz. apps/applications/views.py). Çağıran tarafın
 * ayrımı görebilmesi için `alreadyExisted` işaretlenir — kullanıcıya
 * "başvurun alındı" yerine "zaten başvurmuştun" demek gerekir.
 */
export async function applyToCampaign(input: ApplyInput): Promise<Application & { alreadyExisted: boolean }> {
  const payload = {
    campaign_id: Number(input.campaignId),
    message: input.message,
    proposed_rate: input.proposedRate ?? null,
  };
  const { data, status } = await apiClient.postWithStatus<RawApplication>(ENDPOINTS.applications, payload);
  return { ...normalizeApplication(data), alreadyExisted: status === 200 };
}

/** Brand accepts an application. Custom action route: POST /applications/{id}/accept/. */
export async function acceptApplication(id: string): Promise<Application> {
  const raw = await apiClient.post<RawApplication>(`${applicationDetail(id)}accept/`, {});
  return normalizeApplication(raw);
}

/** Brand rejects an application. Custom action route: POST /applications/{id}/reject/. */
export async function rejectApplication(id: string): Promise<Application> {
  const raw = await apiClient.post<RawApplication>(`${applicationDetail(id)}reject/`, {});
  return normalizeApplication(raw);
}

/** Creator withdraws their own application. DELETE marks it withdrawn server-side (doesn't hard-delete). */
export async function withdrawApplication(id: string): Promise<void> {
  await apiClient.delete<void>(applicationDetail(id));
}

/** Admin/moderator only: revert a decision back to pending. POST /applications/{id}/hold/. */
export async function holdApplication(id: string): Promise<Application> {
  const raw = await apiClient.post<RawApplication>(`${applicationDetail(id)}hold/`, {});
  return normalizeApplication(raw);
}
