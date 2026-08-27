// Notifications API layer — wraps the real Django REST endpoints (see lib/endpoints.ts)
// and normalizes snake_case backend shapes into the app's camelCase `Notification` type.
import { apiClient } from "@/lib/api";
import { ENDPOINTS, notificationDetail } from "@/lib/endpoints";
import type { Notification } from "@/types";

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ApiNotification {
  id: number;
  title: string;
  body: string;
  notification_type: Notification["type"];
  is_read: boolean;
  link: string;
  created_at: string;
  read_at: string | null;
}

function normalizeNotification(n: ApiNotification): Notification {
  return {
    id: String(n.id),
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    isRead: n.is_read,
    type: n.notification_type,
    link: n.link || undefined,
  };
}

export async function listNotifications(): Promise<Notification[]> {
  const page = await apiClient.get<Paginated<ApiNotification>>(ENDPOINTS.notifications);
  return page.results.map(normalizeNotification);
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const updated = await apiClient.patch<ApiNotification>(notificationDetail(id), { is_read: true });
  return normalizeNotification(updated);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post<{ detail: string }>(`${ENDPOINTS.notifications}mark_all_read/`, {});
}

// --- Admin broadcast -------------------------------------------------------
//
// Backed by POST /api/v1/notifications/admin/broadcast/ (AdminBroadcastView).
export interface BroadcastInput {
  title: string;
  body: string;
  target: "all" | "creator" | "brand" | "moderator" | "admin";
  link?: string;
  /** ISO datetime — if set and in the future, sent later via Celery instead of immediately. */
  scheduledAt?: string;
}

export async function broadcastNotification(input: BroadcastInput): Promise<{ queued: boolean; target: string; scheduled_at: string | null }> {
  return apiClient.post(ENDPOINTS.notificationBroadcast, {
    title: input.title,
    body: input.body,
    target: input.target,
    link: input.link,
    scheduled_at: input.scheduledAt,
  });
}
