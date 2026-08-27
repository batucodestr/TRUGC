// Small helper for pages (often Server Components, which can't use the
// useAuth() client hook) that just need the current user's display name —
// e.g. a dashboard greeting — without pulling in the full profile shape.
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";

interface Me {
  email: string;
  role: "creator" | "brand" | "moderator" | "admin";
  profile: { first_name: string; last_name: string; full_name: string };
}

export async function getMyDisplayName(): Promise<string> {
  const me = await apiClient.get<Me>(AUTH_ENDPOINTS.me);
  const name = me.profile.full_name || me.email.split("@")[0];
  return name.split(" ")[0];
}
