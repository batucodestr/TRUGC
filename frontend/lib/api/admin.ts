import { apiClient } from "@/lib/api";
import { getAccessToken } from "@/lib/token-store";
import { ENDPOINTS, adminConversationMessages, adminMessageDetail, userAction, userDetail, verificationReview } from "@/lib/endpoints";
import type { PlatformUser, UserRole } from "@/types";

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Users -------------------------------------------------------------
//
// Backed by GET /api/v1/auth/users/ (UserListView, IsAdminRole-only).
// Mirrors accounts/serializers.py UserSerializer:
// { id, email, role, is_verified, email_verified, is_active, is_banned,
//   ban_reason, date_joined, last_login, profile: {...}, verification: {...} }
interface ApiUser {
  id: number;
  email: string;
  role: UserRole | "moderator";
  is_verified: boolean;
  email_verified: boolean;
  is_active: boolean;
  is_banned: boolean;
  ban_reason: string;
  date_joined: string;
  last_login: string | null;
  profile: { full_name: string; avatar: string | null };
}

function mapUser(u: ApiUser): PlatformUser {
  return {
    id: String(u.id),
    name: u.profile.full_name || u.email.split("@")[0],
    email: u.email,
    avatarUrl: u.profile.avatar ?? "",
    role: u.role,
    status: u.is_banned ? "banned" : !u.is_active ? "suspended" : u.email_verified ? "active" : "pending",
    joinedAt: u.date_joined,
    lastLoginAt: u.last_login,
    verified: u.is_verified,
    banReason: u.ban_reason || undefined,
  };
}

export interface ListUsersParams {
  page?: number;
  search?: string;
  role?: "creator" | "brand" | "moderator" | "admin";
  status?: "active" | "pending" | "suspended" | "banned";
}

export interface ListUsersResult {
  users: PlatformUser[];
  count: number;
}

export async function listPlatformUsers(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  if (params.search) qs.set("search", params.search);
  if (params.role) qs.set("role", params.role);
  if (params.status === "suspended") qs.set("is_active", "false");
  if (params.status === "active") qs.set("is_active", "true");
  if (params.status === "banned") qs.set("is_banned", "true");
  const res = await apiClient.get<Paginated<ApiUser>>(`${ENDPOINTS.auth.users}?${qs.toString()}`);
  return { users: res.results.map(mapUser), count: res.count };
}

export type UserAdminAction = "verify" | "unverify" | "suspend" | "activate" | "ban" | "unban" | "change_role" | "delete";

/** Single-user moderation action. POST /api/v1/auth/users/{id}/action/. */
export async function performUserAction(
  id: string,
  action: UserAdminAction,
  extra?: { role?: string; reason?: string },
): Promise<PlatformUser | void> {
  if (action === "delete") {
    await apiClient.post(userAction(id), { action, ...extra });
    return;
  }
  const raw = await apiClient.post<ApiUser>(userAction(id), { action, ...extra });
  return mapUser(raw);
}

export async function updateUser(id: string, patch: { role?: string }): Promise<PlatformUser> {
  const raw = await apiClient.patch<ApiUser>(userDetail(id), patch);
  return mapUser(raw);
}

export interface PlatformUserDetail extends PlatformUser {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  country: string;
  city: string;
  emailVerified: boolean;
  verificationStatus: string;
}

export async function getUser(id: string): Promise<PlatformUserDetail> {
  const raw = await apiClient.get<
    ApiUser & { profile: { first_name: string; last_name: string; phone_number: string; country: string; city: string }; verification: { status: string } }
  >(userDetail(id));
  return {
    ...mapUser(raw),
    firstName: raw.profile.first_name,
    lastName: raw.profile.last_name,
    phoneNumber: raw.profile.phone_number,
    country: raw.profile.country,
    city: raw.profile.city,
    emailVerified: raw.email_verified,
    verificationStatus: raw.verification?.status ?? "unverified",
  };
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(userDetail(id));
}

/** Bulk moderation. POST /api/v1/auth/users/bulk-action/ {action, ids, role?}. */
export async function bulkUserAction(
  ids: string[],
  action: UserAdminAction,
  extra?: { role?: string; reason?: string },
): Promise<{ updated: number }> {
  return apiClient.post(ENDPOINTS.userBulkAction, { action, ids: ids.map(Number), ...extra });
}

// --- Verifications -------------------------------------------------------
//
// Backed by PendingVerificationListView (GET, paginated) and
// VerificationReviewView (POST), both using accounts/serializers.py
// VerificationQueueSerializer:
//   fields = ["id", "user": {id, email, role}, "status", "document", "notes", "submitted_at", "reviewed_at"]
export interface ApiVerificationStatus {
  id: number;
  user: { id: number; email: string; role: string };
  status: "unverified" | "pending" | "verified" | "rejected";
  document: string | null;
  notes: string;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export async function listPendingVerifications(): Promise<ApiVerificationStatus[]> {
  const res = await apiClient.get<Paginated<ApiVerificationStatus>>(ENDPOINTS.verificationsPending);
  return res.results;
}

/** Approve/reject a pending verification. POST /api/v1/auth/verifications/{id}/review/ with { decision, notes? }. */
export async function reviewVerification(
  id: number | string,
  decision: "approve" | "reject",
  notes?: string,
): Promise<ApiVerificationStatus> {
  return apiClient.post(verificationReview(id), { decision, notes });
}

// --- Message moderation ---------------------------------------------------
//
// Backed by GET /api/v1/messages/admin/conversations/ (AdminConversationListView,
// IsAdminRole-only) — platform-wide oversight, not scoped to the caller.
export interface AdminConversation {
  id: string;
  participants: { id: number; email: string; role: string }[];
  messageCount: number;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
}

interface ApiAdminConversation {
  id: number;
  participants: { id: number; email: string; role: string }[];
  message_count: number;
  last_message: { body: string; created_at: string } | null;
  created_at: string;
  updated_at: string;
}

export async function listAdminConversations(): Promise<AdminConversation[]> {
  const res = await apiClient.get<Paginated<ApiAdminConversation>>(ENDPOINTS.adminConversations);
  return res.results.map((c) => ({
    id: String(c.id),
    participants: c.participants,
    messageCount: c.message_count,
    lastMessageBody: c.last_message?.body ?? null,
    lastMessageAt: c.last_message?.created_at ?? null,
    updatedAt: c.updated_at,
  }));
}

export interface AdminMessage {
  id: string;
  senderEmail: string;
  body: string;
  isFlagged: boolean;
  createdAt: string;
}

interface ApiAdminMessage {
  id: number;
  sender_email: string;
  body: string;
  is_flagged: boolean;
  created_at: string;
}

/** Every message in one conversation, for the moderation detail view. */
export async function listAdminConversationMessages(conversationId: string): Promise<AdminMessage[]> {
  const res = await apiClient.get<Paginated<ApiAdminMessage>>(adminConversationMessages(conversationId));
  return res.results.map((m) => ({ id: String(m.id), senderEmail: m.sender_email, body: m.body, isFlagged: m.is_flagged, createdAt: m.created_at }));
}

export async function flagMessage(id: string): Promise<void> {
  await apiClient.post(adminMessageDetail(id), {});
}

export async function deleteMessage(id: string): Promise<void> {
  await apiClient.delete(adminMessageDetail(id));
}

// --- System status ---------------------------------------------------------
//
// Backed by GET /api/v1/auth/admin/system-status/ (SystemStatusView, IsAdminRole-only).
export interface SystemStatus {
  status: "ok" | "degraded";
  checks: { database: string; redis: string; celery: string; caddy: string };
  workerCount: number;
  counts: { users: number; creators: number; brands: number; campaigns: number; conversations: number };
  disk: { totalGb: number; usedGb: number; percent: number };
  memory: { totalGb: number; usedGb: number; percent: number } | null;
  uptimeSeconds: number;
  checkedAt: string;
}

interface ApiSystemStatus {
  status: "ok" | "degraded";
  checks: { database: string; redis: string; celery: string; caddy: string };
  worker_count: number;
  counts: { users: number; creators: number; brands: number; campaigns: number; conversations: number };
  disk: { total_gb: number; used_gb: number; percent: number };
  memory: { total_gb: number; used_gb: number; percent: number } | null;
  uptime_seconds: number;
  checked_at: string;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const res = await apiClient.get<ApiSystemStatus>(ENDPOINTS.systemStatus);
  return {
    status: res.status,
    checks: res.checks,
    workerCount: res.worker_count,
    counts: res.counts,
    disk: { totalGb: res.disk.total_gb, usedGb: res.disk.used_gb, percent: res.disk.percent },
    memory: res.memory ? { totalGb: res.memory.total_gb, usedGb: res.memory.used_gb, percent: res.memory.percent } : null,
    uptimeSeconds: res.uptime_seconds,
    checkedAt: res.checked_at,
  };
}

// --- Audit log ---------------------------------------------------------
//
// Backed by GET /api/v1/auth/admin/logs/ (AdminActionLogListView).
export interface AdminLogEntry {
  id: number;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
}

interface ApiAdminLog {
  id: number;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
  created_at: string;
}

export async function listAdminLogs(params: { page?: number; action?: string } = {}): Promise<{ logs: AdminLogEntry[]; count: number }> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  if (params.action) qs.set("action", params.action);
  const res = await apiClient.get<Paginated<ApiAdminLog>>(`${ENDPOINTS.adminLogs}?${qs.toString()}`);
  return {
    logs: res.results.map((l) => ({
      id: l.id,
      actorEmail: l.actor_email,
      action: l.action,
      targetType: l.target_type,
      targetId: l.target_id,
      detail: l.detail,
      createdAt: l.created_at,
    })),
    count: res.count,
  };
}

// --- Roles & permissions -------------------------------------------------
//
// Backed by GET/POST /api/v1/auth/admin/roles/ and PATCH/DELETE .../{id}/
// (RoleGroupListView / RoleGroupDetailView) — wraps Django's built-in
// Group/Permission models (the same Groups seeded by manage.py seed_groups).
export interface RolePermission {
  id: number;
  codename: string;
  name: string;
  appLabel?: string;
}

export interface RoleGroup {
  id: number;
  name: string;
  userCount: number;
  permissions: RolePermission[];
}

export async function listRoleGroups(): Promise<{ groups: RoleGroup[]; permissions: RolePermission[] }> {
  const res = await apiClient.get<{
    groups: { id: number; name: string; user_count: number; permissions: { id: number; codename: string; name: string }[] }[];
    permissions: { id: number; codename: string; name: string; app_label: string }[];
  }>(ENDPOINTS.adminRoles);
  return {
    groups: res.groups.map((g) => ({ id: g.id, name: g.name, userCount: g.user_count, permissions: g.permissions })),
    permissions: res.permissions.map((p) => ({ id: p.id, codename: p.codename, name: p.name, appLabel: p.app_label })),
  };
}

export async function createRoleGroup(name: string): Promise<RoleGroup> {
  const res = await apiClient.post<{ id: number; name: string; user_count: number; permissions: RolePermission[] }>(
    ENDPOINTS.adminRoles,
    { name },
  );
  return { id: res.id, name: res.name, userCount: res.user_count, permissions: res.permissions };
}

export async function updateRoleGroupPermissions(id: number, permissionIds: number[]): Promise<RoleGroup> {
  const res = await apiClient.patch<{ id: number; name: string; user_count: number; permissions: RolePermission[] }>(
    `${ENDPOINTS.adminRoles}${id}/`,
    { permission_ids: permissionIds },
  );
  return { id: res.id, name: res.name, userCount: res.user_count, permissions: res.permissions };
}

export async function deleteRoleGroup(id: number): Promise<void> {
  await apiClient.delete(`${ENDPOINTS.adminRoles}${id}/`);
}

/** CSV export needs the Authorization header (a plain <a href> download can't send one) —
 * fetches the file as a blob and triggers a client-side save via a throwaway object URL. */
export async function downloadAnalyticsCsv(): Promise<void> {
  const token = getAccessToken();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const res = await fetch(`${base}${ENDPOINTS.analyticsExport}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("CSV indirilemedi.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trugc-analitik-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
