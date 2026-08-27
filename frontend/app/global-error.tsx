"use client";

import { useEffect } from "react";
import "./globals.css";

// Catastrophic-failure boundary: replaces the ENTIRE document (Next.js
// requires this file to render its own <html>/<body>) when something breaks
// badly enough that even the root layout couldn't render — including if a
// provider in app/layout.tsx (AuthProvider, MotionProvider, ...) is itself
// the cause. Deliberately self-contained: plain elements only, no shadcn
// Button/Link/ErrorShell, so this screen doesn't depend on the same
// component tree that just failed.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body>
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="animate-aurora absolute -top-56 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/25 via-fuchsia-400/15 to-transparent blur-3xl" />
          </div>

          <div className="glass-panel w-full max-w-md rounded-3xl border-border/70 p-8 text-center shadow-2xl shadow-violet-600/10 sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-sm shadow-violet-600/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <p className="mt-6 text-sm font-medium text-violet-600">Hata</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Beklenmeyen bir hata oluştu.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Uygulama bu sayfayı görüntüleyemedi. Bu sorun ekibimize otomatik olarak bildirildi.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Tekrar Dene
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Ana Sayfa
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
