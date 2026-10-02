// Zorunlu kullanıcı akışı: kayıt → e-posta doğrulama → profil fotoğrafı → kullanım.
//
// Akışın durumu her zaman backend'den okunur (`/auth/me/onboarding/`); istemci
// tarafında tutulan hiçbir bayrak bu kararı vermez. Engelleme de backend'de
// yapılır (izin sınıfları) — buradaki bilgi yalnızca kullanıcıyı eksik adıma
// yönlendirmek içindir.

import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";

export type OnboardingStep = "verify_email" | "upload_photo" | null;

export interface OnboardingStatus {
  email_verified: boolean;
  has_profile_photo: boolean;
  email_verification_required: boolean;
  profile_photo_required: boolean;
  complete: boolean;
  next_step: OnboardingStep;
}

/** Varsayılan: akış tamamlanmış kabul edilir — bir ağ hatası, mevcut
 *  kullanıcıyı kurulum ekranına kilitlememeli (gerçek engel backend'de). */
export const ASSUME_COMPLETE: OnboardingStatus = {
  email_verified: true,
  has_profile_photo: true,
  email_verification_required: true,
  profile_photo_required: true,
  complete: true,
  next_step: null,
};

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiClient.get<OnboardingStatus>(AUTH_ENDPOINTS.onboarding);
}

/** Server Component'lerde kullanım için: hata durumunda akışı tamamlanmış sayar. */
export async function getOnboardingStatusSafe(): Promise<OnboardingStatus> {
  try {
    return await getOnboardingStatus();
  } catch {
    return ASSUME_COMPLETE;
  }
}

export async function resendVerificationEmail(): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>(AUTH_ENDPOINTS.resendVerificationEmail);
}

export async function confirmEmailVerification(uid: string, token: string) {
  return apiClient.post<{ detail: string; email: string; onboarding: OnboardingStatus }>(
    AUTH_ENDPOINTS.verifyEmail,
    { uid, token },
  );
}

/** Zorunlu profil fotoğrafını yükler (kullanıcı başına tek adet; yenisi eskisinin yerine geçer). */
export async function uploadProfilePhoto(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);
  return apiClient.upload<{ avatar: string; has_photo: boolean; onboarding: OnboardingStatus }>(
    AUTH_ENDPOINTS.profilePhoto,
    formData,
    "POST",
  );
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MIN_PHOTO_DIMENSION = 100;

/** Yükleme öncesi istemci tarafı ön kontrol. Asıl doğrulama backend'de yapılır. */
export function validatePhotoFile(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return "Desteklenmeyen dosya türü. JPG, PNG veya WEBP yükleyin.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Dosya çok büyük. En fazla 5MB yükleyebilirsiniz.";
  }
  return null;
}
