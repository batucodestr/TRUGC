import Link from "next/link";
import {
  Home,
  HeartPulse,
  GraduationCap,
  LineChart,
  Users2,
  Laptop,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";

export const metadata = { title: "Kariyer — TRUGC" };

const BENEFITS = [
  {
    icon: Home,
    title: "Uzaktan çalışma esnekliği",
    description: "İstersen ofisten, istersen dünyanın herhangi bir yerinden — sonuç odaklı çalışırız.",
  },
  {
    icon: HeartPulse,
    title: "Sağlık sigortası",
    description: "Tüm ekip üyeleri ve aileleri için özel sağlık sigortası sağlıyoruz.",
  },
  {
    icon: GraduationCap,
    title: "Yıllık gelişim bütçesi",
    description: "Kurs, konferans ve sertifikalar için kişisel gelişim bütçesi tanımlıyoruz.",
  },
  {
    icon: LineChart,
    title: "Hisse/opsiyon planı",
    description: "TRUGC büyüdükçe ekibimiz de büyümenin bir parçası oluyor.",
  },
  {
    icon: Users2,
    title: "Ekip buluşmaları",
    description: "Yılda birkaç kez tüm ekibi bir araya getiren buluşmalar düzenliyoruz.",
  },
  {
    icon: Laptop,
    title: "Modern ekipman",
    description: "İşini en iyi şekilde yapabilmen için ihtiyacın olan donanımı karşılıyoruz.",
  },
];

const POSITIONS = [
  { title: "Kıdemli Frontend Mühendisi", department: "Mühendislik", location: "Uzaktan / İstanbul" },
  { title: "Growth Marketing Uzmanı", department: "Pazarlama", location: "İstanbul (Hibrit)" },
  { title: "Creator Operasyonları Yöneticisi", department: "Operasyon", location: "İstanbul (Hibrit)" },
  { title: "Müşteri Başarı Temsilcisi", department: "Müşteri Başarısı", location: "Uzaktan" },
  { title: "Ürün Tasarımcısı (UI/UX)", department: "Tasarım", location: "Uzaktan / İstanbul" },
  { title: "Satış Geliştirme Temsilcisi", department: "Satış", location: "İstanbul (Hibrit)" },
];

export default function KariyerPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <Badge variant="secondary" className="rounded-full font-normal">
            Kariyer
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Türkiye&apos;nin <span className="text-gradient-brand">creator ekonomisini</span> birlikte şekillendirelim
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            TRUGC&apos;de hızlı büyüyen, sahiplenme kültürü güçlü ve gerçek etkisi olan bir ekibin parçası ol.
          </p>
        </Reveal>
      </section>

      <section className="border-y border-border/60 bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-sm font-medium text-violet-600">Neden TRUGC</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Ekibimize kattıklarımız</h2>
          </Reveal>
          <Reveal variant="stagger" className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <RevealItem key={b.title}>
                <Card className="h-full rounded-3xl border-border/70 p-6 shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                    <b.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                </Card>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Açık Pozisyonlar</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Ekibimize katılın</h2>
        </Reveal>
        <Reveal variant="stagger" className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {POSITIONS.map((p) => (
            <RevealItem key={p.title}>
              <Card className="flex h-full flex-col justify-between rounded-3xl border-border/70 p-6 shadow-sm">
                <div>
                  <Badge variant="secondary" className="rounded-full font-normal">
                    {p.department}
                  </Badge>
                  <h3 className="mt-3 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {p.location}
                  </p>
                </div>
                <Button variant="outline" className="mt-6 w-fit rounded-full" asChild>
                  <Link href="/iletisim">
                    Başvur <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Card>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-4xl bg-gradient-brand px-8 py-16 text-center shadow-2xl shadow-violet-600/30 sm:px-16">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">Aradığın pozisyonu bulamadın mı?</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">
              Yine de bize ulaş — doğru fırsat çıktığında seninle iletişime geçelim.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
                <Link href="/iletisim">
                  Bize Ulaşın <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
