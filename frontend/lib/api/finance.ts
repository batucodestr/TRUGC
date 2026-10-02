import { apiClient } from "@/lib/api";
import { ENDPOINTS, posPaymentDetail } from "@/lib/endpoints";
import type { ChartPoint } from "@/types";

// Gerçek backend şekli — apps/payments/serializers.py TransactionSerializer'ı
// yansıtır. Backend'in eski mock'un yaptığı gibi bir "type" (payout/payment/
// refund/fee) alanı SUNMADIĞINA dikkat edin — bir Transaction yalnızca
// `payer` ve `payee` arasındaki bir emanet (escrow) akışıdır ve queryset,
// mevcut kullanıcının her iki taraftan biri olduğu işlemlerle sınırlıdır.
// Ayrıca payer_email veya bir kampanya/marka başlığı sunmaz, yalnızca
// `payee_email` sunar — bu yüzden mevcut kullanıcı payee İSE (kendi
// kazancını görüntüleyen bir creator), gösterilecek gerçek bir "karşı taraf
// adı" yoktur; başvuru id'sine geri döneriz.
export interface ApiTransaction {
  id: number;
  application_id: number;
  payee_email: string;
  amount: string; // DRF DecimalField serializes as a string
  currency: string;
  status: "pending" | "held_in_escrow" | "released" | "refunded" | "failed";
  provider: string;
  provider_reference: string;
  created_at: string;
  updated_at: string;
  released_at: string | null;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const TRANSACTION_STATUS_LABEL_TR: Record<ApiTransaction["status"], string> = {
  pending: "Beklemede",
  held_in_escrow: "Emanette",
  released: "Tamamlandı",
  refunded: "İade edildi",
  failed: "Başarısız",
};

export const TRANSACTION_STATUS_STYLE: Record<ApiTransaction["status"], string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  held_in_escrow: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  released: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  refunded: "bg-muted text-muted-foreground",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

/** Lists transactions visible to the current user (as payer and/or payee), unwrapping DRF pagination. */
export async function listTransactions(): Promise<ApiTransaction[]> {
  const res = await apiClient.get<Paginated<ApiTransaction>>(ENDPOINTS.payments);
  return res.results;
}

/**
 * Buckets transactions by calendar month (using created_at) and sums amounts, producing a
 * real client-side time series in lieu of a backend-provided one (no such endpoint exists).
 * Returns [] when there isn't enough data to plot — callers should render a "not enough
 * data" placeholder in that case rather than a misleading empty chart.
 */
export function bucketTransactionsByMonth(transactions: ApiTransaction[], statuses?: ApiTransaction["status"][]): ChartPoint[] {
  const filtered = statuses ? transactions.filter((t) => statuses.includes(t.status)) : transactions;
  if (filtered.length === 0) return [];

  const buckets = new Map<string, number>();
  for (const t of filtered) {
    const d = new Date(t.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Math.abs(parseFloat(t.amount)));
  }

  const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => {
      const [, month] = key.split("-");
      return { label: MONTHS_TR[Number(month) - 1], value: Math.round(value) };
    });
}

// ---------------------------------------------------------------------------
// Sanal POS (bkz. backend/apps/payments/pos/)
// ---------------------------------------------------------------------------
// Ödeme her zaman sağlayıcının kendi 3D Secure sayfasında tamamlanır; kart
// bilgisi ne bu uygulamaya ne de TRUGC sunucusuna girer. Burada yalnızca
// ödeme oturumu başlatılır ve durumu sunucudan yoklanır.

export type PosPaymentPurpose = "brand_access" | "campaign_escrow";

export interface PosCheckoutResult {
  merchant_oid: string;
  /** "redirect" → redirect_url'e git; "html" → form_html'i göm. */
  mode: "redirect" | "html";
  redirect_url: string;
  form_html: string;
  amount: string;
  currency: string;
  provider: string;
}

export interface PosPaymentRecord {
  merchant_oid: string;
  purpose: PosPaymentPurpose;
  amount: string | null;
  currency: string;
  status: "created" | "pending" | "paid" | "failed" | "cancelled";
  provider: string;
  access_days: number;
  failure_reason: string;
  created_at: string;
  paid_at: string | null;
}

export const POS_STATUS_LABEL_TR: Record<PosPaymentRecord["status"], string> = {
  created: "Oluşturuldu",
  pending: "Ödeme bekleniyor",
  paid: "Ödendi",
  failed: "Başarısız",
  cancelled: "İptal edildi",
};

/** Marka erişim paketi için sanal POS ödemesi başlatır. */
export async function startBrandAccessCheckout(): Promise<PosCheckoutResult> {
  return apiClient.post<PosCheckoutResult>(ENDPOINTS.posCheckout, { purpose: "brand_access" });
}

/** Kabul edilmiş bir başvurunun emanet ödemesini sanal POS ile başlatır. */
export async function startEscrowCheckout(applicationId: number | string, amount: number): Promise<PosCheckoutResult> {
  return apiClient.post<PosCheckoutResult>(ENDPOINTS.posCheckout, {
    purpose: "campaign_escrow",
    application_id: Number(applicationId),
    amount,
  });
}

/** Ödeme durumunu sunucudan okur — sağlayıcının döndürdüğü URL parametrelerine güvenilmez. */
export async function getPosPayment(merchantOid: string): Promise<PosPaymentRecord> {
  return apiClient.get<PosPaymentRecord>(posPaymentDetail(merchantOid));
}

export async function listPosPayments(): Promise<PosPaymentRecord[]> {
  return apiClient.get<PosPaymentRecord[]>(ENDPOINTS.posPayments);
}
