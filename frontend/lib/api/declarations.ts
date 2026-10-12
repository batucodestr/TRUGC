// Ödeme bildirimi ("ödemeyi yaptım") — kullanıcı tarafı ve admin incelemesi.
//
// Sanal POS açılana kadar para havale/EFT ile geliyor; platform ödemeyi kendi
// göremediği için kullanıcı bildirimde bulunur, admin dekontu görüp onaylar.

import { apiClient } from "@/lib/api";
import { ENDPOINTS, declarationReview } from "@/lib/endpoints";

export type DeclarationStatus = "pending" | "approved" | "rejected";

export interface PaymentDeclaration {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  packageCode: string;
  packageName: string;
  tierLabel: string;
  amount: number;
  status: DeclarationStatus;
  statusLabel: string;
  senderNote: string;
  reviewNote: string;
  reviewedByEmail: string;
  reviewedAt: string | null;
  campaignTitle: string;
  createdAt: string;
}

interface ApiDeclaration {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  package_code: string;
  package_name: string;
  tier_label: string;
  amount: string;
  status: DeclarationStatus;
  status_label: string;
  sender_note: string;
  review_note: string;
  reviewed_by_email: string;
  reviewed_at: string | null;
  campaign_title: string;
  created_at: string;
}

function map(raw: ApiDeclaration): PaymentDeclaration {
  return {
    id: raw.id,
    userId: raw.user_id,
    userEmail: raw.user_email,
    userName: raw.user_name,
    packageCode: raw.package_code,
    packageName: raw.package_name,
    tierLabel: raw.tier_label,
    amount: Number(raw.amount),
    status: raw.status,
    statusLabel: raw.status_label,
    senderNote: raw.sender_note,
    reviewNote: raw.review_note,
    reviewedByEmail: raw.reviewed_by_email,
    reviewedAt: raw.reviewed_at,
    campaignTitle: raw.campaign_title,
    createdAt: raw.created_at,
  };
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export async function listDeclarations(status?: DeclarationStatus): Promise<PaymentDeclaration[]> {
  const qs = status ? `?status=${status}` : "";
  const res = await apiClient.get<Paginated<ApiDeclaration>>(`${ENDPOINTS.declarations}${qs}`);
  return res.results.map(map);
}

export interface DeclareInput {
  packageCode: string;
  tierCode: string;
  applicationId?: string | number | null;
  senderNote?: string;
}

/**
 * "Ödemeyi yaptım" bildirimi. Tutar gönderilmez — sunucu paket + süreden
 * kendisi türetir (bkz. PaymentDeclarationCreateSerializer).
 */
export async function declarePayment(input: DeclareInput): Promise<PaymentDeclaration> {
  const raw = await apiClient.post<ApiDeclaration>(ENDPOINTS.declarations, {
    package_code: input.packageCode,
    tier_code: input.tierCode,
    application_id: input.applicationId ? Number(input.applicationId) : null,
    sender_note: input.senderNote ?? "",
  });
  return map(raw);
}

export async function reviewDeclaration(
  id: number,
  decision: "approve" | "reject",
  input: { note?: string; assignPackage?: boolean } = {},
): Promise<PaymentDeclaration> {
  const raw = await apiClient.post<ApiDeclaration>(declarationReview(id, decision), {
    note: input.note ?? "",
    assign_package: input.assignPackage ?? true,
  });
  return map(raw);
}
