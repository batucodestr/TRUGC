"use client";

import Script from "next/script";

declare global {
  interface Window {
    iFrameResize?: (options: Record<string, unknown>, target: string) => unknown;
  }
}

/**
 * PayTR iFrame ödeme formu.
 *
 * Kart bilgileri yalnızca PayTR'nin iframe'ine girilir; TRUGC sunucularına ve
 * sayfa koduna hiç uğramaz. `iframeResizer`, PayTR'nin resmi yükseklik
 * ayarlayıcısıdır (kendi alan adından, yalnızca bu ekranda yüklenir).
 *
 * Ödeme bitince PayTR iframe'i `merchant_ok_url` / `merchant_fail_url`'e
 * yönlendirir (bkz. /payment/return); o sayfa kendini üst pencereye taşır.
 */
export function PaytrFrame({ url }: { url: string }) {
  return (
    <>
      <iframe
        id="paytriframe"
        src={url}
        title="PayTR güvenli ödeme"
        className="w-full"
        style={{ width: "100%", minHeight: 520, border: 0 }}
        scrolling="no"
      />
      <Script
        src="https://www.paytr.com/js/iframeResizer.min.js"
        strategy="afterInteractive"
        onReady={() => {
          window.iFrameResize?.({}, "#paytriframe");
        }}
      />
    </>
  );
}
