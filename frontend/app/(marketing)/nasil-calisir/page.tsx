import Link from "next/link";
import { ArrowRight, Search, MessagesSquare, FileEdit, CheckCircle2, Wallet, UserPlus, Send, Sparkles, ThumbsUp, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Motion/Reveal";

export const metadata = { title: "Nasıl Çalışır — TRUGC" };

const BRAND_STEPS = [
  {
    icon: Search,
    title: "Creator'ları ara ve filtrele",
    description: "Platform, niş, takipçi aralığı, etkileşim oranı ve fiyat gibi kriterlere göre binlerce onaylı creator arasından markana en uygun olanları bul.",
  },
  {
    icon: MessagesSquare,
    title: "İletişime geç",
    description: "Beğendiğin creator'lara doğrudan mesaj gönder, portföylerini incele ve kampanya fikrini ilk elden paylaş.",
  },
  {
    icon: FileEdit,
    title: "Brief paylaş",
    description: "Kampanya hedeflerini, teslimat beklentilerini ve bütçeni içeren detaylı bir brief oluşturarak seçtiğin creator'lara ilet.",
  },
  {
    icon: CheckCircle2,
    title: "Teslimatları onayla",
    description: "Üretilen içerikleri panel üzerinden incele, revizyon talep et veya doğrudan onaylayarak yayına hazır hale getir.",
  },
  {
    icon: Wallet,
    title: "Güvenle öde",
    description: "Bütçen emanet hesabında tutulur; ödeme yalnızca teslimat onaylandığında creator'a otomatik olarak aktarılır.",
  },
];

const CREATOR_STEPS = [
  {
    icon: UserPlus,
    title: "Profil oluştur",
    description: "Sosyal medya hesaplarını bağla, kategori ve niş bilgini gir, en iyi işlerini portföyüne ekleyerek profilini tamamla.",
  },
  {
    icon: Send,
    title: "Kampanyalara başvur",
    description: "Sana uygun kampanyaları keşfet, marka briefini incele ve birkaç dakikada başvurunu gönder.",
  },
  {
    icon: Sparkles,
    title: "İçerik üret",
    description: "Onaylanan iş birliğinde marka briefine uygun, kendi tarzını yansıtan özgün içerik üret.",
  },
  {
    icon: ThumbsUp,
    title: "Onay al",
    description: "Ürettiğin içeriği panel üzerinden markaya teslim et, gerekirse ufak revizyonlarla son haline getir.",
  },
  {
    icon: HandCoins,
    title: "Ödemeni al",
    description: "Marka teslimatı onayladığı anda emanet hesabındaki ödeme otomatik olarak senin hesabına geçer.",
  },
];

function StepSection({
  overline,
  title,
  steps,
  tinted,
}: {
  overline: string;
  title: string;
  steps: typeof BRAND_STEPS;
  tinted?: boolean;
}) {
  return (
    <section className={tinted ? "border-y border-border/60 bg-muted/30 py-20" : "py-20"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">{overline}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        </Reveal>

        <div className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div aria-hidden className="absolute left-0 right-0 top-8 hidden h-px bg-border lg:block" />
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.06} className="relative flex flex-col items-center text-center">
              <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                <step.icon className="h-6 w-6" />
              </span>
              <span className="mt-4 text-xs font-semibold text-violet-600">ADIM {i + 1}</span>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">{step.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function NasilCalisirPage() {
  return (
    <div>
      <section className="relative overflow-hidden pb-16 pt-16 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,theme(colors.violet.200/0.35),transparent_60%)]"
        />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-sm font-medium text-violet-600">Nasıl Çalışır</p>
            <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Keşiften ödemeye <span className="text-gradient-brand">tüm süreç</span> tek platformda
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
              TRUGC, markaları ve creator&apos;ları buluşturan, güvenli ödeme ve şeffaf onay süreçleriyle her adımı
              kolaylaştıran bir platform.
            </p>
          </Reveal>
        </div>
      </section>

      <StepSection overline="Markalar için" title="Markalar için nasıl çalışır" steps={BRAND_STEPS} />
      <StepSection overline="Creator'lar için" title="Creator'lar için nasıl çalışır" steps={CREATOR_STEPS} tinted />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal variant="scale" className="text-center">
          <p className="text-sm font-medium text-violet-600">Sorularınız mı var?</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">SSS sayfamıza göz atın</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Ödeme süreci, komisyonlar, iptal koşulları ve daha fazlası hakkında merak ettiğiniz her şeyin cevabı SSS
            sayfamızda.
          </p>
          <div className="mt-8">
            <Button size="lg" className="rounded-full bg-gradient-brand shadow-lg shadow-violet-600/30 hover:opacity-90" asChild>
              <Link href="/sss">
                SSS Sayfasına Git <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
