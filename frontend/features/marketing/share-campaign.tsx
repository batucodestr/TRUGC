// "Videonu paylaş, 1 hafta ücretsiz üyelik kazan" kampanyası.
//
// Ana sayfada paket bölümünün hemen üstünde, /fiyatlandirma'da ise paketlerin
// altında durur: her iki yerde de kullanıcı tam "ücret" düşünürken ücretsiz
// üyelik kazanma yolunu görür. Katılım tamamen manueldir (paylaşım bağlantısı
// ekibe iletilir, üyelik elle tanımlanır) — bu yüzden arkasında bir API yok,
// bitiş tarihi de yok; kampanya kaldırılacağında bu bileşen çağrı
// noktalarından çıkarılır.

import Link from "next/link";
import { ArrowRight, AtSign, Gift, Send, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/Motion/Reveal";
import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    Icon: Video,
    title: "TRUGC tanıtım videosunu paylaş.",
    detail: "Instagram Reels veya TikTok hesabında yayınla.",
  },
  {
    Icon: AtSign,
    title: "TRUGC hesabını etiketle.",
    detail: "Paylaşımın bize ulaşmasını sağla.",
  },
  {
    Icon: Send,
    title: "Paylaşım bağlantını bize gönder.",
    detail: "Katılımını doğrulayalım.",
  },
];

export function ShareCampaign({ className }: { className?: string }) {
  return (
    <Reveal variant="scale" className={cn(className)}>
      <Card className="relative overflow-hidden rounded-4xl border-violet-600/30 bg-violet-50/60 p-8 shadow-sm sm:p-10 dark:bg-violet-500/10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_60%)]"
        />

        <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-3 py-1 text-xs font-medium text-white shadow">
              <Gift className="size-3.5" /> Kampanya
            </span>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Videonu paylaş, <span className="text-gradient-brand">1 hafta ücretsiz üyelik</span> kazan!
            </h2>
            <p className="mt-4 max-w-lg text-balance leading-relaxed text-muted-foreground">
              TRUGC ailesi olarak seni de büyüyen topluluğumuzun bir parçası olmaya davet ediyoruz. TRUGC tanıtım
              videomuzu paylaş, creator topluluğumuzun büyümesine destek ol ve karşılığında TRUGC&apos;de{" "}
              <span className="font-medium text-foreground">1 hafta ücretsiz üyelik</span> kazan.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Markalarla buluşmak, yeni iş birlikleri yakalamak ve içerik üreticisi olarak kendini geliştirmek için
              sen de bu fırsatı değerlendir.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-gradient-brand hover:opacity-90" asChild>
                <Link href="/iletisim">
                  Kampanyaya katıl <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full" asChild>
                <a href={`tel:${COMPANY.phoneHref}`}>Çağrı destek hattı: {COMPANY.phone}</a>
              </Button>
            </div>
          </div>

          <ol className="space-y-3">
            {STEPS.map(({ Icon, title, detail }, i) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/80 px-5 py-4 shadow-sm backdrop-blur"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/25">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="text-violet-600 dark:text-violet-300">{i + 1}.</span> {title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </Reveal>
  );
}

/** Ana sayfadaki tam genişlikli yerleşim. */
export function ShareCampaignSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <ShareCampaign />
    </section>
  );
}
