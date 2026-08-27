// Central place to turn any thrown error (ApiError, NetworkError, or an
// unexpected JS error) into a short, friendly Turkish message safe to show
// in a toast. Prefers the backend's own message (already Turkish and
// production-safe — see backend/apps/accounts/exceptions.py) and only falls
// back to these generic ones when there isn't one (network failures, or a
// non-ApiError bug).
import { ApiError, NetworkError } from "@/lib/api";

const MESSAGE_BY_KIND: Record<string, string> = {
  network: "İnternet bağlantınızı kontrol edip tekrar deneyin.",
  unauthorized: "Lütfen tekrar giriş yapın.",
  forbidden: "Bu işlemi gerçekleştirme yetkiniz bulunmuyor.",
  not_found: "Aradığınız kaynak bulunamadı.",
  validation: "Gönderilen bilgilerde bir hata var.",
  rate_limited: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.",
  server: "Sunucuda beklenmeyen bir hata oluştu.",
  unknown: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
};

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message || MESSAGE_BY_KIND[err.kind] || MESSAGE_BY_KIND.unknown;
  }
  if (err instanceof NetworkError) {
    return MESSAGE_BY_KIND.network;
  }
  return MESSAGE_BY_KIND.unknown;
}

/** True for ApiError(kind: "unauthorized") — callers can use this to also redirect to /login. */
export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.kind === "unauthorized";
}
