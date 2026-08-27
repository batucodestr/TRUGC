// Brands API layer — wraps the real Django REST endpoints (see lib/endpoints.ts)
// and normalizes snake_case backend shapes into the app's camelCase `Brand` type.
import { apiClient, ApiError } from "@/lib/api";
import { ENDPOINTS, brandAdminDetail, brandDetail } from "@/lib/endpoints";
import type { Brand } from "@/types";

/** DRF's paginated list envelope for every list endpoint. */
interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ApiBrand {
  id: number;
  user_id: number;
  email: string;
  company_name: string;
  logo: string | null;
  cover: string | null;
  website: string;
  industry: string;
  company_size: string;
  description: string;
  headquarters: string;
  founded_year: number | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export function normalizeBrand(api: ApiBrand): Brand {
  const id = String(api.id);
  return {
    id,
    userId: String(api.user_id),
    email: api.email,
    slug: id,
    name: api.company_name,
    logoUrl: api.logo ?? "",
    coverUrl: api.cover ?? "",
    industry: api.industry,
    verified: api.is_verified,
    website: api.website,
    bio: api.description,
    country: api.headquarters || undefined,
    joinedAt: api.created_at,
    companySize: api.company_size || undefined,
    foundedYear: api.founded_year ?? undefined,
  };
}

export interface BrandFilters {
  industry?: string;
  search?: string;
  sort?: "recommended" | "name_asc";
}

/**
 * `industry`/`company_size`/`is_verified` are DjangoFilterBackend fields on BrandListView and
 * `search`/`ordering` are supported natively, so they're sent as query params. Anything else
 * (rating/spend, which don't exist on the backend) has no server-side equivalent.
 */
export async function listBrands(filters: BrandFilters = {}): Promise<Brand[]> {
  const params = new URLSearchParams();
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.search) params.set("search", filters.search);
  params.set("ordering", filters.sort === "name_asc" ? "company_name" : "-created_at");
  const endpoint = `${ENDPOINTS.brands}?${params.toString()}`;

  const page = await apiClient.getPublic<Paginated<ApiBrand>>(endpoint);
  return page.results.map(normalizeBrand);
}

/** Returns undefined only for a real 404 — any other failure (network/5xx) propagates. */
export async function getBrand(id: string): Promise<Brand | undefined> {
  try {
    const api = await apiClient.getPublic<ApiBrand>(brandDetail(id));
    return normalizeBrand(api);
  } catch (err) {
    if (err instanceof ApiError && err.kind === "not_found") return undefined;
    throw err;
  }
}

export async function listFeaturedBrands(count = 6): Promise<Brand[]> {
  // No "featured" concept on the backend — surface verified brands first, most recent.
  const all = await listBrands();
  const verified = all.filter((b) => b.verified);
  return (verified.length ? verified : all).slice(0, count);
}

/** Admin/moderator edit access. PATCH /api/v1/brands/{id}/manage/ (BrandAdminDetailView). */
export async function updateBrandAsAdmin(id: string, patch: { company_name?: string; website?: string; description?: string }): Promise<Brand> {
  const raw = await apiClient.patch<ApiBrand>(brandAdminDetail(id), patch);
  return normalizeBrand(raw);
}

/** /manage brand list — real server-side pagination + count (public listBrands() drops the count). */
export async function listBrandsPaginated(params: { page?: number; search?: string } = {}): Promise<{ brands: Brand[]; count: number }> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  if (params.search) qs.set("search", params.search);
  const page = await apiClient.get<Paginated<ApiBrand>>(`${ENDPOINTS.brands}?${qs.toString()}`);
  return { brands: page.results.map(normalizeBrand), count: page.count };
}
