// Authentication layer. Talks to the real Django JWT backend via the
// app/api/auth/* route handlers for anything touching the refresh token.
//
// Session storage: a client-readable, non-sensitive cookie (`trugc_session`)
// holds only `{ user }` (never a token) so `proxy.ts` can gate protected
// routes without a client-side redirect flash. The actual access token lives
// in memory only (lib/token-store.ts); the refresh token lives in an httpOnly
// cookie set by the /api/auth/* route handlers and is never readable by JS.

import { apiClient, ApiError } from "@/lib/api";
import { AUTH_ENDPOINTS, ENDPOINTS } from "@/lib/endpoints";
import { getAccessToken, setAccessToken } from "@/lib/token-store";
import type { AuthSession, AuthUser, BrandRegisterPayload, CreatorRegisterPayload, LoginPayload } from "@/types/auth";
import type { UserRole } from "@/types";

const SESSION_COOKIE = "trugc_session";
const SESSION_MAX_AGE_DAYS = 7;

function setSessionCookie(session: AuthSession) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify({ user: session.user }));
  const maxAge = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Reads the current session from the cookie (client-side only). Returns null if signed out. */
export function getSession(): AuthSession | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as { user: AuthUser };
    const token = getAccessToken();
    if (!token) return null;
    return { token, user: parsed.user };
  } catch {
    return null;
  }
}

/**
 * On first load the in-memory access token is always empty (a fresh page
 * load runs fresh JS). If a session cookie exists, silently exchange the
 * httpOnly refresh cookie for a new access token before trusting the
 * session. Returns null (and clears the cookie) if the refresh fails.
 */
export async function restoreSession(): Promise<AuthSession | null> {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  if (!match) return null;

  try {
    const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!res.ok) {
      clearSessionCookie();
      return null;
    }
    const data = await res.json();
    setAccessToken(data.access ?? null);
    const parsed = JSON.parse(decodeURIComponent(match[1])) as { user: AuthUser };
    return { token: data.access, user: parsed.user };
  } catch {
    clearSessionCookie();
    return null;
  }
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data?.message ?? "Giriş yapılamadı.", res.status, data);
  }
  // No client-asserted role to validate against — there's no role picker in
  // the login UI anymore. The server's own role (data.user.role) is the only
  // source of truth, and callers redirect off DASHBOARD_PATH_BY_ROLE[role].
  setAccessToken(data.access);
  const user: AuthUser = {
    id: String(data.user.id),
    name: data.user.email,
    email: data.user.email,
    role: data.user.role,
    avatarUrl: "",
    isStaff: Boolean(data.user.isStaff),
    isSuperuser: Boolean(data.user.isSuperuser),
  };
  const session: AuthSession = { token: data.access, user };
  setSessionCookie(session);
  return session;
}

/** Fetches the creator-category catalog and resolves a display label (e.g. "Fashion") to its backend id. */
async function resolveCategoryId(label: string): Promise<number | undefined> {
  const categories = await apiClient.getPublic<{ id: number; name: string; slug: string }[]>(ENDPOINTS.creatorCategories);
  const match = categories.find((c) => c.name.toLowerCase() === label.toLowerCase());
  return match?.id;
}

export async function registerCreator(payload: CreatorRegisterPayload): Promise<AuthSession> {
  await apiClient.post(AUTH_ENDPOINTS.register, {
    email: payload.email,
    password: payload.password,
    password_confirm: payload.password,
    role: "creator",
  });

  const session = await login({ email: payload.email, password: payload.password });

  const [firstName, ...rest] = payload.fullName.trim().split(" ");
  await apiClient.patch(AUTH_ENDPOINTS.myProfile, { first_name: firstName, last_name: rest.join(" ") });

  const categoryId = await resolveCategoryId(payload.category);
  await apiClient.patch(ENDPOINTS.myCreator, { display_name: payload.fullName, category_ids: categoryId ? [categoryId] : [] });

  return { ...session, user: { ...session.user, name: payload.fullName } };
}

export async function registerBrand(payload: BrandRegisterPayload): Promise<AuthSession> {
  await apiClient.post(AUTH_ENDPOINTS.register, {
    email: payload.email,
    password: payload.password,
    password_confirm: payload.password,
    role: "brand",
  });

  const session = await login({ email: payload.email, password: payload.password });

  const [firstName, ...rest] = payload.contactName.trim().split(" ");
  await apiClient.patch(AUTH_ENDPOINTS.myProfile, { first_name: firstName, last_name: rest.join(" ") });

  await apiClient.patch(ENDPOINTS.myBrand, { company_name: payload.companyName, website: payload.website ?? "" });

  return { ...session, user: { ...session.user, name: payload.companyName } };
}

export function logout(): void {
  clearSessionCookie();
  const token = getAccessToken();
  setAccessToken(null);
  fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).catch(() => undefined);
}

// Admin deliberately doesn't live under /dashboard — it's a hidden, unlinked
// entry point (/manage), never surfaced in any public-facing UI.
export const DASHBOARD_PATH_BY_ROLE: Record<UserRole, string> = {
  creator: "/dashboard/creator",
  brand: "/dashboard/brand",
  admin: "/manage",
};
