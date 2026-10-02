// Hafta sonu ücretsiz / hafta içi ücretli durumunun istemci tarafındaki
// okuma katmanı.
//
// ÖNEMLİ: Gün hesabı burada YAPILMAZ. `new Date().getDay()` kullanmak,
// kullanıcının cihaz saatine (ve saat dilimine) güvenmek anlamına gelirdi;
// saati Cumartesi'ye alan biri ücretsiz kullanım elde edebilirdi. Durum her
// zaman backend'den (`GET /payments/pricing/`, sunucu saati + sunucu saat
// dilimi) okunur; backend ayrıca fiyat alanlarını yanıtlardan düşürür ve ödeme
// uçlarını kapatır, dolayısıyla buradaki bilgi yalnızca arayüzü doğru
// göstermek içindir — güvenlik sınırı değildir.

import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface PosState {
  provider: string;
  configured: boolean;
  /** Sağlayıcı kurulu VE ücretli dönemde miyiz? */
  available: boolean;
}

export interface BrandAccessPlan {
  price: string;
  days: number;
  purchasable: boolean;
}

export interface PricingState {
  /** Ücretsiz dönem (varsayılan: Cumartesi + Pazar). */
  free: boolean;
  paid: boolean;
  /** Ödeme akışının açık olup olmadığı — ücretsiz dönemde her zaman false. */
  payments_enabled: boolean;
  weekend_free_enabled: boolean;
  timezone: string;
  /** Sunucunun ücretlendirme saat dilimindeki zamanı (ISO 8601). */
  server_time: string;
  /** Pazartesi=0 ... Pazar=6 */
  weekday: number;
  weekday_label: string;
  free_weekdays: number[];
  free_weekday_labels: string[];
  /** Durumun değişeceği ilk gece yarısı (ISO 8601) veya null. */
  next_change_at: string | null;
  commission_percent: string;
  currency: string;
  notice: string;
  pos: PosState;
  brand_access_plan: BrandAccessPlan;
}

/**
 * Backend'e ulaşılamadığında kullanılan güvenli varsayılan: **ücretli** dönem.
 *
 * Ters yön (ücretsiz varsaymak) arayüzde fiyatları gizler ama backend yine
 * ücret isteyeceği için kullanıcıyı yanıltırdı. Ücretli varsaymak en kötü
 * durumda hafta sonu fiyat alanlarını bir an için gösterir; backend zaten
 * tahsilat yapmaz.
 */
export const PAID_FALLBACK_STATE: PricingState = {
  free: false,
  paid: true,
  payments_enabled: true,
  weekend_free_enabled: true,
  timezone: "Europe/Istanbul",
  server_time: "",
  weekday: 0,
  weekday_label: "",
  free_weekdays: [5, 6],
  free_weekday_labels: ["Cumartesi", "Pazar"],
  next_change_at: null,
  commission_percent: "0",
  currency: "TRY",
  notice: "",
  pos: { provider: "", configured: false, available: false },
  brand_access_plan: { price: "0", days: 30, purchasable: false },
};

/** Ücretlendirme durumunu backend'den okur. Hata durumunda ücretli döneme düşer. */
export async function getPricingState(): Promise<PricingState> {
  try {
    return await apiClient.getPublic<PricingState>(ENDPOINTS.pricingState);
  } catch {
    return PAID_FALLBACK_STATE;
  }
}

/** Ücretsiz dönem afişinde gösterilen "… tarihine kadar" metni. */
export function formatFreePeriodWindow(state: PricingState): string {
  if (!state.next_change_at) return "";
  const date = new Date(state.next_change_at);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: state.timezone || undefined,
  }).format(date);
}

/** Ücretsiz dönemde fiyat gösterilmez; bu yardımcı çağrı noktalarını kısaltır. */
export function shouldShowPrices(state: PricingState | null): boolean {
  return !state?.free;
}
