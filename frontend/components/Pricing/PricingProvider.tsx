"use client";

// Ücretlendirme durumunu (hafta sonu ücretsiz / hafta içi ücretli) bir kez
// okuyup tüm istemci bileşenlerine dağıtır. Durum SUNUCUDAN gelir — hiçbir
// bileşen `new Date().getDay()` ile gün hesaplamaz (kullanıcının cihaz saati
// güvenilir değildir).
//
// Kök layout'ta AuthProvider ile birlikte mount edilir. Durum okunana kadar
// `loading: true` olur; fiyat gösteren bileşenler bu süre boyunca fiyatı
// gizler, böylece hafta sonu bir anlık "fiyat parlaması" yaşanmaz.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getPricingState, type PricingState } from "@/lib/pricing";

interface PricingContextValue {
  state: PricingState | null;
  loading: boolean;
  /** Ücretsiz dönem. Durum yüklenirken `true` kabul edilir (fiyat gösterme). */
  isFree: boolean;
  /** Fiyat/ücret alanları gösterilebilir mi? */
  showPrices: boolean;
  refresh: () => Promise<void>;
}

const PricingContext = createContext<PricingContextValue | null>(null);

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PricingState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const next = await getPricingState();
    setState(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPricingState().then((next) => {
      if (cancelled) return;
      setState(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Gece yarısı sınırını sekmesi açık kalan kullanıcılar için de doğru
  // yakalamak adına, durumun değişeceği ana kadar bekleyip yeniden okur.
  useEffect(() => {
    if (!state?.next_change_at) return;
    const msUntilChange = new Date(state.next_change_at).getTime() - Date.now();
    if (!Number.isFinite(msUntilChange)) return;
    // Sunucu saatiyle istemci saati arasındaki küçük kaymalar için 5 sn pay.
    const delay = Math.min(Math.max(msUntilChange + 5000, 5000), 2 ** 31 - 1);
    const timer = setTimeout(() => void load(), delay);
    return () => clearTimeout(timer);
  }, [state?.next_change_at, load]);

  const isFree = loading ? true : Boolean(state?.free);

  return (
    <PricingContext.Provider value={{ state, loading, isFree, showPrices: !isFree, refresh: load }}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing(): PricingContextValue {
  const ctx = useContext(PricingContext);
  if (!ctx) {
    // Provider dışında kalan bir ağaçta (ör. izole test render'ı) çökmek
    // yerine "ücretsiz dönem" gibi davranır: fiyat göstermemek, yanlış fiyat
    // göstermekten iyidir.
    return {
      state: null,
      loading: true,
      isFree: true,
      showPrices: false,
      refresh: async () => undefined,
    };
  }
  return ctx;
}
