// Yalnızca mevcut kullanıcının görünen adına ihtiyaç duyan sayfalar için
// (genellikle useAuth() istemci hook'unu kullanamayan Server Component'ler)
// küçük bir yardımcı — ör. bir dashboard karşılaması — tüm profil şeklini
// çekmeden.
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS, ENDPOINTS } from "@/lib/endpoints";

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

/**
 * Giriş yapan markanın şirket adı; yoksa kullanıcı adına düşer.
 *
 * Marka panosunun başlığında sabit kodlanmış bir örnek şirket adı
 * ("Lumo Skincare") duruyordu — her marka kendi panosunda başka bir şirketin
 * adıyla karşılanıyordu.
 */
export async function getMyBrandName(): Promise<string> {
  try {
    const brand = await apiClient.get<{ company_name: string }>(ENDPOINTS.myBrand);
    if (brand.company_name) return brand.company_name;
  } catch {
    // Marka kaydı okunamadıysa karşılama metni yüzünden sayfa boş kalmasın.
  }
  return getMyDisplayName();
}
