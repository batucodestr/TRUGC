import Link from "next/link";
import { ArrowRight, Camera, MessageCircle, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";

export const metadata = { title: "Creator Rehberi — TRUGC" };

const GUIDES = [
  {
    icon: Camera,
    title: "Güçlü bir profil nasıl oluşturulur",
    points: [
      "Kapak görselini ve profil fotoğrafını yüksek çözünürlüklü, iyi ışıklandırılmış içeriklerden seçin.",
      "Biyografinizde niş alanınızı ve içerik tarzınızı net cümlelerle anlatın — belirsiz ifadelerden kaçının.",
      "Portfolyonuza en iyi performans gösteren 6-8 içeriği ekleyin, sayıdan çok kaliteyi önceleyin.",
      "Tüm sosyal hesaplarınızı bağlayın; markalar çoklu platform erişimine sahip creator'ları tercih ediyor.",
    ],
  },
  {
    icon: Target,
    title: "Doğru fiyatlandırma nasıl yapılır",
    points: [
      "Takipçi sayısından çok etkileşim oranınıza göre fiyatlandırma yapın — 50K takipçili %8 etkileşim, 200K takipçili %1 etkileşimden daha değerlidir.",
      "Paketlerinizi kademelendirin: tek gönderi, çoklu platform paketi ve tam kampanya paketi olarak ayırın.",
      "Piyasa ortalamasını görmek için niş alanınızdaki benzer profillerin başlangıç fiyatlarını inceleyin.",
      "İlk kampanyalarınızda biraz esnek olun; değerlendirmeler biriktikçe fiyatlarınızı kademeli olarak artırın.",
    ],
  },
  {
    icon: MessageCircle,
    title: "Markalarla iletişimde dikkat edilmesi gerekenler",
    points: [
      "İlk mesajınızda kampanyaya neden uygun olduğunuzu somut örneklerle anlatın, genel bir şablon kullanmayın.",
      "Yanıt sürenizi kısa tutun — profilinizdeki 'yanıt süresi' rozeti markaların ilk baktığı kriterlerden biri.",
      "Teslim tarihlerini netleştirin ve üzerinde anlaştığınız her detayı yazılı olarak teyit edin.",
      "Geri bildirimlere açık olun; revizyon taleplerini profesyonelce karşılamak uzun vadeli iş birliklerinin anahtarıdır.",
    ],
  },
  {
    icon: Sparkles,
    title: "İlk kampanyana nasıl hazırlanırsın",
    points: [
      "Kampanya brief'ini dikkatlice okuyun ve markanın ses tonuna uygun bir içerik konsepti oluşturun.",
      "Çekim öncesi bir mini plan hazırlayın: lokasyon, ürün kullanımı ve mesaj akışını netleştirin.",
      "Ham çekimleri teslim tarihinden en az bir gün önce bitirin, düzenleme için pay bırakın.",
      "İçeriği yayınlamadan önce markanın onayını alın ve kullanım haklarıyla ilgili şartları kontrol edin.",
    ],
  },
];

export default function CreatorRehberiPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <Badge variant="secondary" className="rounded-full font-normal">
            Creator Kaynakları
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Creator Rehberi
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            Profilinizi güçlendirmekten ilk kampanyanıza hazırlanmaya kadar, TRUGC&apos;de başarılı bir creator
            olmanız için bilmeniz gereken her şey burada.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <Reveal variant="stagger" staggerChildren={0.1} className="space-y-6">
          {GUIDES.map((guide) => (
            <RevealItem key={guide.title}>
              <Card className="rounded-3xl border-border/70 p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                    <guide.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold sm:text-xl">{guide.title}</h2>
                    <ul className="mt-4 space-y-3">
                      {guide.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" />
                          {point}
                        </li>
                      ))}
                    </ul>
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
              Öğrendiklerini uygulamaya hazır mısın?
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">
              Profilini oluştur, paketlerini belirle ve ilk kampanyana bugün başvur.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
                <Link href="/creator-ol">
                  Creator Ol <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link href="/kazanc-rehberi">Kazanç Rehberini İncele</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
