// Kullanıcının kendi bakiyesi ve üyelik paketi.
//
// Admin uçlarıyla (lib/api/admin.ts) aynı veriyi döner ama yalnızca giriş
// yapan kullanıcının kendi kaydını verir: GET /payments/me/wallet/.

import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface MyMembership {
  packageCode: string;
  packageName: string;
  tierLabel: string;
  applicationQuota: number | null;
  applicationsUsed: number;
  remainingApplications: number | null;
  expiresAt: string | null;
  isActive: boolean;
  daysRemaining: number;
}

/**
 * Sunucunun "bu kullanıcı şu an ödemeden şunu yapabilir mi?" cevabı.
 *
 * İstemcide hesaplanamaz: hafta sonu ücretsiz dönemi, MEMBERSHIP_ENFORCED
 * anahtarı ve yetkili hesap muafiyeti yalnızca backend'de bilinir (bkz.
 * apps/payments/membership.py). Alan dönmezse hepsi `false` sayılır — arayüz
 * yine de 402 yanıtlarına tepki verir, uyarı yalnızca önceden gösterilmez.
 */
export interface MembershipGates {
  messagingLocked: boolean;
  applicationNeedsPayment: boolean;
  campaignNeedsPayment: boolean;
}

export interface MyWallet {
  balance: number;
  membership: MyMembership;
  gates: MembershipGates;
}

interface ApiResponse {
  wallet: { balance: string; currency: string };
  membership: {
    package_code: string;
    package_name: string;
    tier_label: string;
    application_quota: number | null;
    applications_used: number;
    remaining_applications: number | null;
    expires_at: string | null;
    is_active: boolean;
    days_remaining: number;
  };
  gates?: {
    messaging_locked?: boolean;
    application_needs_payment?: boolean;
    campaign_needs_payment?: boolean;
  };
}

/**
 * Bakiye + paket durumu. Hata durumunda `null` döner: pano bu kart yüzünden
 * tamamen boş kalmaz, kart hiç basılmaz.
 */
export async function getMyWallet(): Promise<MyWallet | null> {
  try {
    const raw = await apiClient.get<ApiResponse>(ENDPOINTS.myWallet);
    return {
      balance: Number(raw.wallet.balance),
      membership: {
        packageCode: raw.membership.package_code,
        packageName: raw.membership.package_name,
        tierLabel: raw.membership.tier_label,
        applicationQuota: raw.membership.application_quota,
        applicationsUsed: raw.membership.applications_used,
        remainingApplications: raw.membership.remaining_applications,
        expiresAt: raw.membership.expires_at,
        isActive: raw.membership.is_active,
        daysRemaining: raw.membership.days_remaining,
      },
      gates: {
        messagingLocked: Boolean(raw.gates?.messaging_locked),
        applicationNeedsPayment: Boolean(raw.gates?.application_needs_payment),
        campaignNeedsPayment: Boolean(raw.gates?.campaign_needs_payment),
      },
    };
  } catch {
    return null;
  }
}
