// Sol menüdeki sayı rozetleri — gerçek veriden hesaplanır (sahte sayı yok).
import { listApplications, listMyApplications } from "@/lib/api/applications";
import { listCollaborations } from "@/lib/api/collaborations";
import { listNotifications } from "@/lib/api/notifications";
import { listCampaigns } from "@/lib/api/campaigns";

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export async function getNavBadges(role: "brand" | "creator"): Promise<Record<string, number>> {
  const [notifications, collaborations] = await Promise.all([
    safe(listNotifications(), []),
    safe(listCollaborations(), []),
  ]);
  const messages = notifications.filter((n) => !n.isRead && n.type === "message").length;

  if (role === "brand") {
    const applications = await safe(listApplications(), []);
    return {
      applications: applications.filter((a) => a.status === "pending" && !a.awaitingPayment).length,
      collaborations: collaborations.filter((c) => c.status === "delivered" || (c.status === "approved" && c.payment_status !== "paid")).length,
      messages,
    };
  }
  const [applications, campaigns] = await Promise.all([safe(listMyApplications(), []), safe(listCampaigns(), [])]);
  return {
    campaigns: campaigns.length,
    applications: applications.filter((a) => a.status === "pending").length,
    collaborations: collaborations.filter((c) => c.status === "awaiting_content" || c.status === "revision").length,
    messages,
  };
}
