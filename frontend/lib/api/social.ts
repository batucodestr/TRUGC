// Sosyal hesap bağlama (resmî OAuth). Şifre ASLA istenmez.
import { apiClient } from "@/lib/api";
import { socialCallback, socialConnect, socialDisconnect } from "@/lib/endpoints";

export type OAuthPlatform = "instagram" | "tiktok" | "youtube";

export const OAUTH_PLATFORMS: OAuthPlatform[] = ["instagram", "tiktok", "youtube"];

export async function getAuthorizeUrl(platform: OAuthPlatform): Promise<string> {
  const { authorize_url } = await apiClient.get<{ authorize_url: string }>(socialConnect(platform));
  return authorize_url;
}

export async function completeOAuth(platform: OAuthPlatform, code: string, state: string) {
  return apiClient.post<{ platform: string; handle: string; followers_count: number; is_verified: boolean }>(
    socialCallback(platform),
    { code, state },
  );
}

export async function disconnectSocial(platform: OAuthPlatform): Promise<void> {
  await apiClient.delete(socialDisconnect(platform));
}
