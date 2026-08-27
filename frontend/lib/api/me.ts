// Yalnızca mevcut kullanıcının görünen adına ihtiyaç duyan sayfalar için
// (genellikle useAuth() istemci hook'unu kullanamayan Server Component'ler)
// küçük bir yardımcı — ör. bir dashboard karşılaması — tüm profil şeklini
// çekmeden.
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
