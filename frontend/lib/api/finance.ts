import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { ChartPoint } from "@/types";

// Real backend shape — mirrors apps/payments/serializers.py TransactionSerializer.
// Note the backend does NOT expose a "type" (payout/payment/refund/fee) field like the
// old mock did — a Transaction is just an escrow flow between `payer` and `payee`, and
// the queryset is scoped to transactions where the current user is either party. It also
// does not expose payer_email or a campaign/brand title, only `payee_email` — so when the
// current user IS the payee (a creator viewing their own earnings), there is no real
// "counterparty name" to show; we fall back to the application id.
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
