// İş birlikleri API katmanı (apps/collaborations). Durum akışı:
// İçerik Bekleniyor → Teslim Edildi → Revizyon → Onaylandı → Ödendi.
import { apiClient } from "@/lib/api";
import { ENDPOINTS, collaborationAction } from "@/lib/endpoints";

export type CollaborationStatus = "awaiting_content" | "delivered" | "revision" | "approved" | "paid" | "cancelled";

export const COLLABORATION_STATUS_TR: Record<CollaborationStatus, string> = {
  awaiting_content: "İçerik Bekleniyor",
  delivered: "Teslim Edildi",
  revision: "Revizyon",
  approved: "Onaylandı",
  paid: "Ödendi",
  cancelled: "İptal",
};

export interface Submission {
  id: number;
  revision_number: number;
  file: string | null;
  url: string;
  note: string;
  status: "submitted" | "approved" | "revision_requested";
  feedback: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface Collaboration {
  id: number;
  campaign: number;
  campaign_title: string;
  brand_name: string;
  brand_user_id: number;
  creator_name: string;
  creator_user_id: number;
  status: CollaborationStatus;
  agreed_amount: string;
  due_at: string | null;
  delivered_on_time: boolean | null;
  payment_status: "pending" | "paid" | "refunded" | "failed" | null;
  /** Sunucuda hesaplanan marka ödeme dökümü (bütçe + %10 komisyon). */
  charge: { budget: string; commission: string; total: string; vat: string };
  submissions: Submission[];
  created_at: string;
}

interface Paginated<T> {
  results: T[];
}

export async function listCollaborations(): Promise<Collaboration[]> {
  const data = await apiClient.get<Paginated<Collaboration> | Collaboration[]>(ENDPOINTS.collaborations);
  return Array.isArray(data) ? data : data.results;
}

export async function submitContent(id: number, input: { url?: string; note?: string; file?: File | null }): Promise<Collaboration> {
  const form = new FormData();
  if (input.url) form.append("url", input.url);
  if (input.note) form.append("note", input.note);
  if (input.file) form.append("file", input.file);
  return apiClient.upload<Collaboration>(collaborationAction(id, "submit"), form);
}

export async function approveCollaboration(id: number): Promise<Collaboration> {
  return apiClient.post<Collaboration>(collaborationAction(id, "approve"));
}

export async function requestRevision(id: number, feedback: string): Promise<Collaboration> {
  return apiClient.post<Collaboration>(collaborationAction(id, "revision"), { feedback });
}
