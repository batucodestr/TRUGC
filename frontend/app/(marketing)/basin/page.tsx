import { Download, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/Motion/Reveal";

export const metadata = { title: "Basın — TRUGC" };

const OUTLETS = ["Webrazzi", "Fintech İstanbul", "Dijital Ajanslar Derneği", "StartupBrisk", "Marketing Türkiye"];

export default function BasinPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <Badge variant="secondary" className="rounded-full font-normal">
            Basın
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Basın ve medya için <span className="text-gradient-brand">TRUGC</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            Şirket bilgileri, marka varlıkları ve basın ekibimizle iletişime geçmek için gereken her şey burada.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal variant="slide-up">
          <Card className="rounded-3xl border-border/70 p-8 shadow-sm">
            <p className="text-sm font-medium text-violet-600">Şirket Hakkında</p>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              TRUGC, markaları Instagram, TikTok, YouTube ve Twitch&apos;teki onaylı içerik üreticileriyle
              buluşturan bir influencer pazarlama platformudur. 2022 yılında İstanbul&apos;da kurulan şirket, keşiften
              iş birliği yönetimine ve güvenli ödemeye kadar tüm süreci tek bir platformda birleştirerek sektördeki
              dağınık ve manuel iş akışlarına çözüm sunar. Bugün itibarıyla 12.000&apos;in üzerinde onaylı creator ve
              3.000&apos;in üzerinde markaya ev sahipliği yapan TRUGC, Türkiye&apos;nin hızla büyüyen creator
              ekonomisinin altyapısını inşa etmeye devam ediyor.
            </p>
          </Card>
        </Reveal>
      </section>

      <section className="border-y border-border/60 bg-muted/30 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              TRUGC&apos;den bahseden basın kuruluşları
            </p>
          </Reveal>
          <Reveal variant="stagger" className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {OUTLETS.map((outlet) => (
              <span key={outlet} className="text-lg font-semibold uppercase tracking-wide text-muted-foreground/70">
                {outlet}
              </span>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Reveal variant="slide-up">
            <Card className="flex h-full flex-col rounded-3xl border-border/70 p-8 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                <Download className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold">Basın Kiti&apos;ni İndirin</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Logo varlıklarımız, marka renklerimiz, kurucu fotoğrafları ve şirket bilgilerini içeren basın kitimizi
                talep edin.
              </p>
              <Button size="lg" className="mt-6 w-fit rounded-full bg-gradient-brand hover:opacity-90" asChild>
                <a href="mailto:basin@trugc.com">Basın Kiti Talep Et</a>
              </Button>
            </Card>
          </Reveal>

          <Reveal variant="slide-up" delay={0.1}>
            <Card className="flex h-full flex-col rounded-3xl border-border/70 p-8 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                <Mail className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold">Basın İletişimi</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Röportaj talepleri, veri paylaşımı veya diğer basın soruları için doğrudan ekibimize ulaşabilirsiniz.
              </p>
              <a
                href="mailto:basin@trugc.com"
                className="mt-6 flex items-center gap-2 text-lg font-semibold text-violet-600 hover:underline"
              >
                <Mail className="h-4 w-4" /> basin@trugc.com
              </a>
            </Card>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
