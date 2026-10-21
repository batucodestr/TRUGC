// Ödeme kapısı: "bu işlem için paket gerekiyor" durumunun arayüzdeki tek
// karşılığı.
//
// Kural basittir: kayıt ücretsizdir, marka **ilan yayınlarken**, creator
// **kampanyaya başvururken** öder; mesajlaşma ödemeden sonra açılır. Sunucu
// bu durumlarda 402 MEMBERSHIP_REQUIRED döner (bkz.
// backend/apps/payments/membership.py). Her ekran aynı mesajı ve aynı ödeme
// bağlantısını göstersin diye yardımcılar burada toplanır.
import { toast } from "sonner";
import { getErrorMessage, isMembershipRequired } from "@/lib/error-message";
import type { UserRole } from "@/types";

/** Rolün panel içi ödeme ekranı. Rolsüz/yetkili hesaplar fiyatlandırma sayfasına gider. */
export function paymentPathForRole(role?: UserRole | string | null): string {
  if (role === "brand") return "/dashboard/brand/odeme";
  if (role === "creator") return "/dashboard/creator/odeme";
  return "/fiyatlandirma";
}

export const MESSAGING_LOCKED_TEXT =
  "Mesajlaşma, paketiniz aktifleştiğinde açılır. Ödemeniz onaylandığı an karşı tarafla yazışabilirsiniz.";

/**
 * 402 ise ödeme ekranına götüren eylemli bir toast gösterir ve `true` döner;
 * değilse hiçbir şey yapmaz ve `false` döner (çağıran kendi hatasını gösterir).
 */
export function handleMembershipRequired(
  err: unknown,
  opts: { role?: UserRole | string | null; title: string; navigate: (href: string) => void },
): boolean {
  if (!isMembershipRequired(err)) return false;
  const href = paymentPathForRole(opts.role);
  toast.error(opts.title, {
    description: getErrorMessage(err),
    action: { label: "Ödemeye geç", onClick: () => opts.navigate(href) },
  });
  return true;
}
