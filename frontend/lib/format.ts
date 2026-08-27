// Sabit USD → TRY kuru. Yalnızca köken olarak USD cinsinden yazılmış statik
// pazarlama içeriği (fiyatlandırma planları, örnek dashboard rakamları) için
// kullanılır — backend'den gelen gerçek creator/marka/işlem tutarları zaten
// TRY cinsindendir ve bu kurla çarpılmamalıdır.
export const USD_TO_TRY_RATE = 40;

export function convertUsdToTry(usd: number): number {
  return usd * USD_TO_TRY_RATE;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatCurrency(value: number, opts?: { compact?: boolean }): string {
  if (opts?.compact) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) return "az önce";
  if (diffMin < 60) return `${diffMin}dk önce`;
  if (diffHour < 24) return `${diffHour}sa önce`;
  if (diffDay < 7) return `${diffDay}g önce`;
  return formatDate(iso);
}
