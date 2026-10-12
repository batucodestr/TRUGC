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
  payment_required: "Bu işlem için aktif bir üyelik paketiniz olmalı.",
  rate_limited: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.",
  server: "Sunucuda beklenmeyen bir hata oluştu.",
  unknown: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
};

/**
 * Alan bazlı doğrulama hatalarını tek bir cümleye çevirir.
 *
 * Backend, 400 yanıtlarında `message` alanına her zaman aynı genel metni
 * ("Gönderilen bilgilerde bir hata var.") koyar ve asıl sebebi `fields`
 * içinde döner (bkz. apps/accounts/exceptions.py). Yalnızca `message`
 * okunduğunda kullanıcı neyin yanlış olduğunu asla öğrenemiyordu — bu yüzden
 * alan hataları varsa onlar gösterilir.
 *
 * En fazla üç mesaj birleştirilir: bir toast'a sığmayan uzunlukta bir liste
 * okunmaz hale gelir ve ilk hatalar zaten en açıklayıcı olanlardır.
 */
function fieldErrorText(err: ApiError): string | null {
  if (!err.fieldErrors) return null;
  const messages = Object.values(err.fieldErrors)
    .flat()
    .filter((message): message is string => typeof message === "string" && message.length > 0);
  if (messages.length === 0) return null;
  return messages.slice(0, 3).join(" ");
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return fieldErrorText(err) || err.message || MESSAGE_BY_KIND[err.kind] || MESSAGE_BY_KIND.unknown;
  }
  if (err instanceof NetworkError) {
    return MESSAGE_BY_KIND.network;
  }
  return MESSAGE_BY_KIND.unknown;
}

/** True for the 402 "aktif paket gerekiyor" case — callers can point the user at /fiyatlandirma. */
export function isMembershipRequired(err: unknown): boolean {
  return err instanceof ApiError && err.kind === "payment_required";
}

/** True for ApiError(kind: "unauthorized") — callers can use this to also redirect to /login. */
export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.kind === "unauthorized";
}
