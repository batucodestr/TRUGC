// Fırlatılan herhangi bir hatayı (ApiError, NetworkError veya beklenmeyen bir
// JS hatası) bir toast'ta gösterilmesi güvenli, kısa ve dostane bir Türkçe
// mesaja dönüştürmek için merkezi bir yer. Backend'in kendi mesajını tercih
// eder (zaten Türkçe ve production'a uygun — bkz.
// backend/apps/accounts/exceptions.py) ve yalnızca bir mesaj olmadığında
// (ağ hataları veya ApiError olmayan bir hata) bu genel mesajlara geri döner.
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
