import Link from "next/link";
import { ArrowRight, Search, Settings2, ShieldCheck, BarChart3, FileEdit, Users, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";
import { MagneticButton } from "@/components/Motion/MagneticButton";

export const metadata = { title: "Marka Çözümleri — TRUGC" };

const BENEFITS = [
  {
    icon: Search,
    title: "Doğrulanmış creator'ları hızlıca bul",
    description: "Platform, niş, fiyat aralığı ve etkileşim oranına göre filtreleyerek markana en uygun creator'lara saniyeler içinde ulaş.",
  },
  {
    icon: Settings2,
    title: "Uçtan uca kampanya yönetimi",
    description: "Brief paylaşımından teslimat onayına kadar tüm kampanya sürecini tek panelden yönet, ekibinle birlikte takip et.",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli ödeme altyapısı",
    description: "Bütçeni emanet hesabında tut, ödeme yalnızca teslimat onaylandığında creator'a aktarılsın.",
  },
  {
    icon: BarChart3,
    title: "Detaylı analitik ve raporlama",
    description: "Kampanya performansını erişim, etkileşim ve dönüşüm bazında izle, sonraki kampanyalarını verilerle şekillendir.",
  },
];

const STEPS = [
  {
    icon: FileEdit,
    title: "Briefini oluştur",
    description: "Kampanya hedefini, bütçeni ve beklentilerini birkaç adımda tanımla.",
  },
  {
    icon: Users,
    title: "Doğru creator'larla eşleş",
    description: "Sistemin önerdiği veya kendi seçtiğin creator'lara teklif gönder, başvuruları değerlendir.",
  },
  {
    icon: LineChart,
    title: "Sonuçları takip et",
    description: "Yayına giren içerikleri ve kampanya metriklerini gerçek zamanlı panelden izle.",
  },
];

const STATS = [
  { value: "%184", label: "Ortalama etkileşim artışı" },
  { value: "6 gün", label: "Ortalama kampanya başlatma süresi" },
  { value: "%92", label: "Marka memnuniyet oranı" },
  { value: "12.400+", label: "Onaylı creator ağı" },
];

export default function MarkaCozumleriPage() {
  return (
    <div>
      <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,theme(colors.violet.200/0.35),transparent_60%)]"
        />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-sm font-medium text-violet-600">Markalar için</p>
            <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Kampanyalarını <span className="text-gradient-brand">doğru creator&apos;larla</span> büyüt
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
              TRUGC, markanı onaylı içerik üreticileriyle buluşturur; briefinden ödemene kadar tüm süreci tek bir
              panelden güvenle yönetirsin.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mx-auto mt-8 flex max-w-md flex-col justify-center gap-3 sm:flex-row">
            <MagneticButton>
              <Button size="lg" className="h-12 w-full rounded-full bg-gradient-brand px-6 shadow-lg shadow-violet-600/30 hover:opacity-90 sm:w-auto" asChild>
                <Link href="/dashboard/brand/campaigns/new">
                  Kampanya Oluştur <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </MagneticButton>
            <Button size="lg" variant="outline" className="h-12 w-full rounded-full sm:w-auto" asChild>
              <Link href="/creators">İçerik Üreticileri Keşfet</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Neden TRUGC</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Markalar için tasarlanmış araçlar</h2>
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

      <section className="border-y border-border/60 bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-sm font-medium text-violet-600">Süreç</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Markalar için nasıl çalışır</h2>
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
          <p className="text-sm font-medium text-violet-600">Rakamlarla TRUGC</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Markaların elde ettiği sonuçlar</h2>
        </Reveal>

        <Reveal variant="stagger" className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {STATS.map((s) => (
            <RevealItem key={s.label}>
              <Card className="h-full rounded-2xl border-border/70 p-6 text-center shadow-sm">
                <p className="text-3xl font-semibold text-gradient-brand sm:text-4xl">{s.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
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
              İlk kampanyanı bugün yayınla
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">
              Briefini oluştur, doğru creator&apos;larla eşleş ve sonuçları gerçek zamanlı takip et.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
                <Link href="/dashboard/brand/campaigns/new">
                  Kampanya Oluştur <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
