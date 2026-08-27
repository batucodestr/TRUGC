import Link from "next/link";
import { ArrowRight, ShieldCheck, Handshake, Zap, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";

export const metadata = { title: "Hakkımızda — TRUGC" };

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Şeffaflık",
    description: "Fiyatlandırmadan performans verisine kadar her adımı markalarla ve creator'larla açıkça paylaşırız.",
  },
  {
    icon: Handshake,
    title: "Güven",
    description: "Ödemeler emanet hesabında güvence altında; onaylı profiller sayesinde her iş birliği güvenle başlar.",
  },
  {
    icon: Zap,
    title: "Hız",
    description: "Keşiften kampanya lansmanına kadar geçen süreyi haftalardan günlere indirmek için tasarladık.",
  },
  {
    icon: Users,
    title: "Creator-first yaklaşım",
    description: "Platformdaki her karar, creator'ların emeğinin adil karşılık bulmasını gözeterek alınır.",
  },
];

export default function HakkimizdaPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <Badge variant="secondary" className="rounded-full font-normal">
            TRUGC Hakkında
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Influencer pazarlamasını <span className="text-gradient-brand">dağınıklıktan</span> kurtarıyoruz
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            Excel tabloları, WhatsApp yazışmaları ve kaybolan DM&apos;ler yerine; markaların ve creator&apos;ların tek bir
            platformda güvenle buluştuğu bir yapı kuruyoruz.
          </p>
        </Reveal>
      </section>

      <section className="border-y border-border/60 bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-sm font-medium text-violet-600">Misyonumuz</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Türkiye&apos;nin creator ekonomisini büyütüyoruz</h2>
          </Reveal>
          <Reveal variant="slide-up" delay={0.1} className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              TRUGC, 2026 yılında; markaların doğru içerik üreticilerini bulmasını ve iş birliklerini güvenle
              yönetmesini tek bir platformda kolaylaştırmak amacıyla kuruldu. Amacımız, Türkiye&apos;deki creator
              ekonomisinin büyümesine katkı sağlayacak bir altyapı sunmak.
            </p>
            <p>
              Markaların onaylı creator&apos;ları hızla keşfedebildiği, iş birliklerini tek ekrandan yönetebildiği ve
              ödemelerin emanet hesabıyla güvence altına alındığı bir yapı kuruyoruz — sektörün ihtiyaç duyduğu
              şeffaflığı ve güveni sağlamak için.
            </p>
            <p>
              Hedefimiz, markalar ve içerik üreticilerini güvenli, şeffaf ve sürdürülebilir bir iş birliği ortamında
              buluşturmak; her iki tarafın da emeğinin karşılığını adil şekilde almasını sağlamak.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">İlkelerimiz</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Değerlerimiz</h2>
        </Reveal>
        <Reveal variant="stagger" className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <RevealItem key={v.title}>
              <Card className="h-full rounded-3xl border-border/70 p-6 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                  <v.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.description}</p>
              </Card>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-4xl bg-gradient-brand px-8 py-16 text-center shadow-2xl shadow-violet-600/30 sm:px-16">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">Hikayemizin bir parçası olun</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">
              İster marka olun ister creator, TRUGC&apos;de büyüme hikayenize bugün başlayın.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
                <Link href="/creators">
                  İçerik Üreticileri Keşfet <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link href="/dashboard/creator">Creator Ol</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
