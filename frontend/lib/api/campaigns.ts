// Kampanyalar için API katmanı. Gerçek Django `CampaignViewSet`'ini (`/api/v1/campaigns/`) okur/yazar.
import { apiClient, ApiError } from "@/lib/api";
import { ENDPOINTS, campaignDetail, campaignMedia } from "@/lib/endpoints";
import type { Campaign, CampaignDeliverable, CampaignMediaItem, CampaignStatus, SocialPlatform } from "@/types";

// ---------------------------------------------------------------------------
// Gerçek API şekilleri (apps/campaigns/serializers.py CampaignSerializer'ı yansıtır)
// ---------------------------------------------------------------------------

interface RawCategory {
  id: number;
  name: string;
  slug: string;
}

interface RawCampaignMedia {
  id: number;
  file: string;
  caption: string;
  uploaded_at: string;
}

interface RawCampaignDeliverable {
  id: number;
  description: string;
  platform: string;
  quantity: number;
  order: number;
}

interface RawCampaign {
  id: number;
  brand_id: number;
  brand_name: string;
  title: string;
  description: string;
  categories: RawCategory[];
  platform: string;
  budget_min: string;
  budget_max: string;
  requirements: string;
  deliverables: RawCampaignDeliverable[];
  start_date: string | null;
  deadline: string;
  status: string;
  is_open: boolean;
  media_files: RawCampaignMedia[];
  created_at: string;
  updated_at: string;
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

function normalizeCampaign(raw: RawCampaign): Campaign {
  const platform = (raw.platform as SocialPlatform) || "instagram";
  const deliverables: CampaignDeliverable[] = (raw.deliverables ?? []).map((d) => ({
    id: d.id,
    platform: (d.platform as SocialPlatform) || "",
    description: d.description,
    quantity: d.quantity,
    order: d.order,
  }));
  const media: CampaignMediaItem[] = (raw.media_files ?? []).map((m) => ({
    id: m.id,
    url: m.file,
    caption: m.caption,
  }));

  return {
    id: String(raw.id),
    slug: String(raw.id),
    title: raw.title,
    brandId: String(raw.brand_id),
    brandName: raw.brand_name,
    brandLogoUrl: undefined,
    brandVerified: undefined,
    coverUrl: media[0]?.url,
    status: raw.status as CampaignStatus,
    categories: (raw.categories ?? []).map((c) => c.name),
    platform,
    platforms: [platform],
    budgetMin: Number(raw.budget_min),
    budgetMax: Number(raw.budget_max),
    description: raw.description,
    requirements: raw.requirements ?? "",
    deliverables,
    media,
    applicantsCount: undefined,
    spotsAvailable: undefined,
    startDate: raw.start_date ?? undefined,
    endDate: raw.deadline,
    applicationDeadline: raw.deadline,
    createdAt: raw.created_at,
    location: undefined,
  };
}

// ---------------------------------------------------------------------------
// Okumalar
// ---------------------------------------------------------------------------

export interface CampaignFilters {
  status?: CampaignStatus;
  /** Category name (backend M2M is filterable by id server-side; we match by name client-side). */
  category?: string;
  platforms?: SocialPlatform[];
  search?: string;
}

export async function listCampaigns(filters: CampaignFilters = {}): Promise<Campaign[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.platforms?.length === 1) params.set("platform", filters.platforms[0]);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  const endpoint = qs ? `${ENDPOINTS.campaigns}?${qs}` : ENDPOINTS.campaigns;

  const data = await apiClient.get<Paginated<RawCampaign>>(endpoint);
  let results = unwrap(data).map(normalizeCampaign);
  if (filters.category) results = results.filter((c) => c.categories.includes(filters.category!));
  if (filters.platforms && filters.platforms.length > 1) {
    results = results.filter((c) => filters.platforms!.includes(c.platform));
  }
  return results;
}

/** Returns undefined only for a real 404 — any other failure (network/5xx) propagates. */
export async function getCampaign(id: string): Promise<Campaign | undefined> {
  try {
    const raw = await apiClient.get<RawCampaign>(campaignDetail(id));
    return normalizeCampaign(raw);
  } catch (err) {
    if (err instanceof ApiError && err.kind === "not_found") return undefined;
    throw err;
  }
}

export async function listActiveCampaigns(count?: number): Promise<Campaign[]> {
  const results = await listCampaigns({ status: "published" });
  return count ? results.slice(0, count) : results;
}

/** Campaigns owned by the currently authenticated brand (any status), for the brand dashboard. */
export async function listMyCampaigns(): Promise<Campaign[]> {
  const me = await apiClient.get<{ id: number }>(ENDPOINTS.myBrand);
  const all = await listCampaigns({});
  return all.filter((c) => c.brandId === String(me.id));
}

// ---------------------------------------------------------------------------
// Yazmalar (yalnızca marka: oluştur/güncelle/sil)
// ---------------------------------------------------------------------------

export interface CampaignInput {
  title: string;
  description: string;
  categoryIds?: number[];
  platform: SocialPlatform;
  budgetMin: number;
  budgetMax: number;
  requirements?: string;
  startDate?: string;
  deadline: string;
  status?: CampaignStatus;
}

function toPayload(input: Partial<CampaignInput>) {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.categoryIds !== undefined) payload.category_ids = input.categoryIds;
  if (input.platform !== undefined) payload.platform = input.platform;
  if (input.budgetMin !== undefined) payload.budget_min = input.budgetMin;
  if (input.budgetMax !== undefined) payload.budget_max = input.budgetMax;
  if (input.requirements !== undefined) payload.requirements = input.requirements;
  if (input.startDate !== undefined) payload.start_date = input.startDate || null;
  if (input.deadline !== undefined) payload.deadline = input.deadline;
  if (input.status !== undefined) payload.status = input.status;
  return payload;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const raw = await apiClient.post<RawCampaign>(ENDPOINTS.campaigns, toPayload(input));
  return normalizeCampaign(raw);
}

export async function updateCampaign(id: string, input: Partial<CampaignInput>): Promise<Campaign> {
  const raw = await apiClient.patch<RawCampaign>(campaignDetail(id), toPayload(input));
  return normalizeCampaign(raw);
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete<void>(campaignDetail(id));
}

/** Endpoint for uploading campaign media (used with `components/upload/file-upload.tsx`). */
export function campaignMediaEndpoint(campaignId: string): string {
  return campaignMedia(campaignId);
}

/** /manage campaign list — real server-side pagination + count (listCampaigns() drops the count). */
export async function listCampaignsPaginated(params: { page?: number; search?: string; status?: CampaignStatus } = {}): Promise<{
  campaigns: Campaign[];
  count: number;
}> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  const data = await apiClient.get<Paginated<RawCampaign>>(`${ENDPOINTS.campaigns}?${qs.toString()}`);
  return { campaigns: data.results.map(normalizeCampaign), count: data.count };
}

/** Admin/moderator bulk moderation. POST /api/v1/campaigns/bulk/ {action, ids}. */
export async function bulkCampaignAction(
  ids: string[],
  action: "unpublish" | "close" | "delete",
): Promise<{ updated: number }> {
  return apiClient.post(ENDPOINTS.campaignBulkAction, { action, ids: ids.map(Number) });
}
