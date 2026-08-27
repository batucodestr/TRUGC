// Creators API layer — wraps the real Django REST endpoints (see lib/endpoints.ts)
// and normalizes snake_case backend shapes into the app's camelCase `Creator` type.
import { apiClient, ApiError } from "@/lib/api";
import { ENDPOINTS, creatorAdminDetail, creatorDetail, myPackageDetail } from "@/lib/endpoints";
import type { Creator, CreatorCategory, CreatorPackage, PortfolioItem, SocialPlatform, SocialStat } from "@/types";

export interface CreatorFilters {
  platforms?: SocialPlatform[];
  categories?: CreatorCategory[];
  country?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: "recommended" | "followers_desc" | "price_asc" | "price_desc" | "rating_desc";
}

/** DRF's paginated list envelope for every list endpoint except creators/categories/. */
interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
}

interface ApiSocialAccount {
  id: number;
  platform: string;
  handle: string;
  profile_url: string;
  followers_count: number;
  engagement_rate: number;
  is_verified: boolean;
}

interface ApiPortfolioItem {
  id: number;
  kind: "portfolio" | "media_kit";
  title: string;
  description: string;
  media: string | null;
  external_url: string;
  platform: string;
  created_at: string;
}

interface ApiPackage {
  id: number;
  title: string;
  description: string;
  price: string | number;
  deliverables: string[];
  turnaround_days: number;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiCreator {
  id: number;
  user_id: number;
  email: string;
  avatar: string | null;
  display_name: string;
  bio: string;
  cover: string | null;
  categories: ApiCategory[];
  is_verified: boolean;
  is_available: boolean;
  social_accounts: ApiSocialAccount[];
  portfolio_items: ApiPortfolioItem[];
  packages: ApiPackage[];
  total_followers: number;
  average_engagement_rate: number;
  created_at: string;
  updated_at: string;
}

function normalizeSocial(acc: ApiSocialAccount): SocialStat {
  return {
    platform: acc.platform as SocialPlatform,
    handle: acc.handle,
    followers: acc.followers_count,
    engagementRate: Number(acc.engagement_rate),
    url: acc.profile_url || undefined,
  };
}

function normalizePackage(pkg: ApiPackage): CreatorPackage {
  return {
    id: String(pkg.id),
    title: pkg.title,
    description: pkg.description,
    price: Number(pkg.price),
    deliverables: pkg.deliverables,
    turnaroundDays: pkg.turnaround_days,
    popular: pkg.is_popular,
  };
}

function normalizePortfolioItem(item: ApiPortfolioItem): PortfolioItem {
  return {
    id: String(item.id),
    imageUrl: item.media ?? undefined,
    title: item.title,
    kind: item.kind,
    description: item.description || undefined,
    externalUrl: item.external_url || undefined,
    platform: item.platform || undefined,
  };
}

/** Derives a display handle from the email local-part since the backend has no username field. */
function usernameFromEmail(email: string): string {
  return email.split("@")[0] ?? email;
}

export function normalizeCreator(api: ApiCreator): Creator {
  const id = String(api.id);
  return {
    id,
    userId: String(api.user_id),
    slug: id,
    name: api.display_name || usernameFromEmail(api.email),
    username: usernameFromEmail(api.email),
    avatarUrl: api.avatar ?? "",
    coverUrl: api.cover ?? "",
    verified: api.is_verified,
    categories: api.categories.map((c) => c.name) as CreatorCategory[],
    bio: api.bio,
    socials: api.social_accounts.map(normalizeSocial),
    portfolio: api.portfolio_items.filter((p) => p.kind === "portfolio").map(normalizePortfolioItem),
    packages: api.packages.map(normalizePackage),
    joinedAt: api.created_at,
    totalFollowers: api.total_followers,
    averageEngagementRate: api.average_engagement_rate,
    isAvailable: api.is_available,
  };
}

function totalFollowersOf(creator: Creator): number {
  return creator.socials.reduce((sum, s) => sum + s.followers, 0);
}
function maxEngagementOf(creator: Creator): number {
  return Math.max(0, ...creator.socials.map((s) => s.engagementRate));
}

/**
 * Filters DjangoFilterBackend/SearchFilter/OrderingFilter support natively on
 * CreatorListView (`is_verified`, `is_available`, `categories`, `social_accounts__platform`,
 * `search`, `ordering=created_at`) are sent as query params. Follower/engagement/price-range
 * filters and rating sort have no backend equivalent (no such fields exist on Creator), so
 * they're applied client-side on the single returned page — a known limitation given
 * PAGE_SIZE=20 pagination; a full-catalog client-side filter/sort is out of scope here.
 */
export async function listCreators(filters: CreatorFilters = {}): Promise<Creator[]> {
  const params = new URLSearchParams();
  if (filters.platforms?.length) params.set("social_accounts__platform", filters.platforms[0]);
  if (filters.categories?.length) params.set("categories__name", filters.categories[0]);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort === "followers_desc" || filters.sort === "recommended" || !filters.sort) {
    params.set("ordering", "-created_at");
  }
  const qs = params.toString();
  const endpoint = qs ? `${ENDPOINTS.creators}?${qs}` : ENDPOINTS.creators;

  const page = await apiClient.getPublic<Paginated<ApiCreator>>(endpoint);
  let results = page.results.map(normalizeCreator);

  if (filters.country) {
    results = results.filter((c) => c.country === filters.country);
  }
  if (filters.minFollowers != null) {
    results = results.filter((c) => totalFollowersOf(c) >= filters.minFollowers!);
  }
  if (filters.maxFollowers != null) {
    results = results.filter((c) => totalFollowersOf(c) <= filters.maxFollowers!);
  }
  if (filters.minEngagement != null) {
    results = results.filter((c) => maxEngagementOf(c) >= filters.minEngagement!);
  }
  if (filters.minPrice != null) {
    results = results.filter((c) => (c.startingPrice ?? 0) >= filters.minPrice!);
  }
  if (filters.maxPrice != null) {
    results = results.filter((c) => (c.startingPrice ?? 0) <= filters.maxPrice!);
  }

  switch (filters.sort) {
    case "followers_desc":
      results.sort((a, b) => totalFollowersOf(b) - totalFollowersOf(a));
      break;
    case "price_asc":
      results.sort((a, b) => (a.startingPrice ?? 0) - (b.startingPrice ?? 0));
      break;
    case "price_desc":
      results.sort((a, b) => (b.startingPrice ?? 0) - (a.startingPrice ?? 0));
      break;
    case "rating_desc":
      results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    default:
      results.sort((a, b) => Number(b.featured) - Number(a.featured) || (b.rating ?? 0) - (a.rating ?? 0));
  }

  return results;
}

/** Returns undefined only for a real 404 (unknown id) — any other failure (network/5xx) propagates so the page can show a proper error state instead of a false "not found". */
export async function getCreator(id: string): Promise<Creator | undefined> {
  try {
    const api = await apiClient.getPublic<ApiCreator>(creatorDetail(id));
    return normalizeCreator(api);
  } catch (err) {
    if (err instanceof ApiError && err.kind === "not_found") return undefined;
    throw err;
  }
}

export async function listFeaturedCreators(count = 8): Promise<Creator[]> {
  // No "featured" concept on the backend — surface verified creators first, most recent.
  const all = await listCreators();
  const verified = all.filter((c) => c.verified);
  return (verified.length ? verified : all).slice(0, count);
}

// --- My packages (creator-owned pricing offers) -------------------------

export interface PackageInput {
  title: string;
  description: string;
  price: number;
  deliverables: string[];
  turnaroundDays: number;
  popular?: boolean;
}

function toApiPackagePayload(input: PackageInput) {
  return {
    title: input.title,
    description: input.description,
    price: input.price,
    deliverables: input.deliverables,
    turnaround_days: input.turnaroundDays,
    is_popular: input.popular ?? false,
  };
}

export async function listMyPackages(): Promise<CreatorPackage[]> {
  const res = await apiClient.get<Paginated<ApiPackage>>(ENDPOINTS.myPackages);
  return res.results.map(normalizePackage);
}

export async function createPackage(input: PackageInput): Promise<CreatorPackage> {
  const created = await apiClient.post<ApiPackage>(ENDPOINTS.myPackages, toApiPackagePayload(input));
  return normalizePackage(created);
}

export async function updatePackage(id: string, input: PackageInput): Promise<CreatorPackage> {
  const updated = await apiClient.patch<ApiPackage>(myPackageDetail(id), toApiPackagePayload(input));
  return normalizePackage(updated);
}

export async function deletePackage(id: string): Promise<void> {
  await apiClient.delete(myPackageDetail(id));
}

/** Admin/moderator edit access. PATCH /api/v1/creators/{id}/manage/ (CreatorAdminDetailView). */
export async function updateCreatorAsAdmin(id: string, patch: { display_name?: string; bio?: string; is_available?: boolean }): Promise<Creator> {
  const raw = await apiClient.patch<ApiCreator>(creatorAdminDetail(id), patch);
  return normalizeCreator(raw);
}

/** /manage creator list — real server-side pagination + count (public listCreators() drops the count). */
export async function listCreatorsPaginated(params: { page?: number; search?: string } = {}): Promise<{ creators: Creator[]; count: number }> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  if (params.search) qs.set("search", params.search);
  const page = await apiClient.get<Paginated<ApiCreator>>(`${ENDPOINTS.creators}?${qs.toString()}`);
  return { creators: page.results.map(normalizeCreator), count: page.count };
}
