import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, ShieldCheck, Wallet, TrendingUp, UserPlus, FileText, Sparkles, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";
import { MagneticButton } from "@/components/Motion/MagneticButton";

export const metadata = { title: "Creator Ol — TRUGC" };

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: "Markalar tarafından keşfedil",
    description: "Onaylı profilin sayesinde niş ve içerik tarzına uygun markalar seni kolayca bulur, doğrudan teklif gönderir.",
  },
  {
    icon: ShieldCheck,
    title: "Emanet güvencesiyle güvenli ödeme",
    description: "Kampanya ücreti işe başlamadan önce emanet hesabında bloke edilir; teslimatı onaylandığında otomatik olarak hesabına geçer.",
  },
  {
    icon: Wallet,
    title: "Fiyatını kendin belirle",
    description: "Paketlerini, teslim sürelerini ve ücretlerini sen tanımlarsın — kimse senin adına pazarlık yapmaz.",
  },
  {
    icon: TrendingUp,
    title: "Portföyünü büyüt",
    description: "Tamamladığın her iş birliği profiline eklenir, değerlendirmelerin birikir ve yeni markalara ulaşman kolaylaşır.",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Profilini oluştur",
    description: "Sosyal medya hesaplarını bağla, niş ve kategori seç, portföyünden en iyi işlerini ekle.",
  },
  {
    icon: FileText,
    title: "Kampanyalara başvur",
    description: "Sana uygun kampanyaları keşfet, marka briefini incele ve birkaç dakikada başvurunu gönder.",
  },
  {
    icon: Sparkles,
    title: "İçerik üret ve ödemeni al",
    description: "Onaylanan iş birliğinde içeriğini üret, teslim et ve ödemen emanet hesabından güvenle hesabına geçsin.",
  },
];

const TESTIMONIALS = [
  {
    name: "Ece Aydemir",
    role: "Cilt bakımı & yaşam tarzı",
    avatarSeed: "ece-aydemir",
    quote:
      "TRUGC'e katıldıktan sonra üç ayda beş farklı markayla çalıştım. Emanet sistemi sayesinde ödeme konusunda hiç endişelenmedim, teslimat onaylanır onaylanmaz para hesabıma geçti.",
  },
  {
    name: "Mert Kaya",
    role: "Teknoloji & inceleme",
    avatarSeed: "mert-kaya",
    quote:
      "Kendi paketlerimi ve fiyatlarımı belirleyebilmek işimi ciddi bir gelir kalemine dönüştürdü. Sadece son iki ayda aylık gelirim iki katına çıktı.",
  },
];

export default function CreatorOlPage() {
  return (
    <div>
      <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,theme(colors.violet.200/0.35),transparent_60%)]"
        />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-sm font-medium text-violet-600">Creator&apos;lar için</p>
            <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              İçeriklerini <span className="text-gradient-brand">gelire</span> dönüştür
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
              TRUGC&apos;de profilini oluştur, markalarla doğrudan bağlantı kur ve emanet güvencesiyle her iş
              birliğinin ödemesini eksiksiz al.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mx-auto mt-8 flex max-w-md flex-col justify-center gap-3 sm:flex-row">
            <MagneticButton>
              <Button size="lg" className="h-12 w-full rounded-full bg-gradient-brand px-6 shadow-lg shadow-violet-600/30 hover:opacity-90 sm:w-auto" asChild>
                <Link href="/dashboard/creator">
                  Creator Panelini Aç <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </MagneticButton>
            <Button size="lg" variant="outline" className="h-12 w-full rounded-full sm:w-auto" asChild>
              <Link href="#nasil-calisir">Nasıl çalışır?</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Neden TRUGC</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Creator olmanın avantajları</h2>
        </Reveal>

        <Reveal variant="stagger" className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <RevealItem key={b.title}>
              <Card className="h-full rounded-2xl border-border/70 p-6 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
                  <b.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
              </Card>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <section id="nasil-calisir" className="border-y border-border/60 bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-sm font-medium text-violet-600">Süreç</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Creator&apos;lar için nasıl çalışır</h2>
          </Reveal>

          <div className="relative mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div aria-hidden className="absolute left-0 right-0 top-8 hidden h-px bg-border sm:block" />
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08} className="relative flex flex-col items-center text-center">
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

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Creator&apos;larımız ne diyor</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Onların hikayesi seninkinin bir sonrakisi olabilir</h2>
        </Reveal>

        <Reveal variant="stagger" className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <RevealItem key={t.name}>
              <Card className="flex h-full flex-col justify-between rounded-3xl border-border/70 p-6 shadow-sm">
                <div>
                  <Quote className="h-6 w-6 text-violet-600/40" />
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">{t.quote}</p>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <Image
                    src={`https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(t.name)}&backgroundColor=7c3aed&fontFamily=Arial`}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </Card>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-4xl bg-gradient-brand px-8 py-16 text-center shadow-2xl shadow-violet-600/30 sm:px-16">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Creator yolculuğuna bugün başla
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">
              Profilini birkaç dakikada oluştur, ilk kampanyana başvur ve emanet güvencesiyle ödemeni al.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
                <Link href="/dashboard/creator">
                  Creator Panelini Aç <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
