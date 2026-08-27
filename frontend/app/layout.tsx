import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { MotionProvider } from "@/components/Motion/MotionProvider";
import { SmoothScroll } from "@/components/Motion/SmoothScroll";
import { AuthProvider } from "@/components/Auth/AuthProvider";
import "./globals.css";

// Uygulama, statik bir build'e gömülmesi güvenli içerik yerine canlı bir
// Django API'sine dayanır (marketplace listeleri, kampanyalar, kimlik
// doğrulama gerektiren dashboard'lar) — kullanıcı başına dashboard verisi
// asla paylaşılan statik bir dosyaya önceden render edilmemelidir ve genel
// listeler, bayat bir build-zamanı anlık görüntüsünün kabul edilebilir
// olamayacağı kadar sık değişir. Bu aynı zamanda `next build`'in imaj build
// anında (yalnızca çalışma zamanında) backend'e erişilebilir olmasına asla
// ihtiyaç duymadığı anlamına gelir; bu da kardeş compose servislerine ağ
// erişimi olmayan Docker build'leri için önemlidir.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "TRUGC";
const SITE_TITLE = "TRUGC — Türkiye'nin UGC Creator Pazaryeri";
const SITE_DESCRIPTION =
  "Markaları fark yaratan creator'larla buluşturun. Keşfedin, kampanya oluşturun ve iş birliği yapın — hepsi tek yerde.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <SmoothScroll>
            <AuthProvider>
              <TooltipProvider delayDuration={150}>
                {children}
                <Toaster position="bottom-right" richColors closeButton />
              </TooltipProvider>
            </AuthProvider>
          </SmoothScroll>
        </MotionProvider>
      </body>
    </html>
  );
}
