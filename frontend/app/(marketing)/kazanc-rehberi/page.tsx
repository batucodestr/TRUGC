import Link from "next/link";
import { ArrowRight, PiggyBank, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";

export const metadata = { title: "Kazanç Rehberi — TRUGC" };

const SECTIONS = [
  {
    icon: Wallet,
    title: "Paket fiyatlandırma stratejileri",
    description:
      "Kazancınızı artırmanın en etkili yolu doğru paket yapısı kurmaktır. Tek gönderi, çoklu platform ve tam kampanya paketlerini ayrı ayrı fiyatlandırarak markalara farklı bütçe seçenekleri sunun. Yüksek performanslı içerik formatlarınızı (örneğin Reels veya kısa video) daha yüksek fiyatlandırın, çünkü markalar bu formatlara daha fazla değer veriyor.",
  },
  {
    icon: ShieldCheck,
    title: "Ödeme süreci ve emanet güvencesi nasıl işler",
    description:
      "Bir marka kampanyanızı onayladığında, ödeme tutarı TRUGC'nin emanet (escrow) hesabında güvence altına alınır. İçeriğinizi teslim edip marka onayı aldıktan sonra ödeme otomatik olarak sizin hesabınıza aktarılır. Bu sistem, hem sizin emeğinizin karşılıksız kalmamasını hem de markanın güvenle ödeme yapmasını sağlar.",
  },
  {
    icon: PiggyBank,
    title: "Platform komisyon oranı",
    description:
      "TRUGC, tamamlanan her kampanyadan %8.5 hizmet bedeli keser — bu oran, güvenli ödeme altyapısı, kampanya eşleştirme ve platform desteğini kapsar. Komisyon, ödeme creator hesabına aktarılmadan otomatik olarak düşülür; ekstra bir işlem yapmanız gerekmez. Creator olarak platforma katılmak ve profil oluşturmak tamamen ücretsizdir.",
  },
  {
    icon: TrendingUp,
    title: "Ödeme sıklığı, çekim limitleri ve gelir artırma ipuçları",
    description:
      "Onaylanan ödemeler hesabınıza düştüğü anda çekilebilir durumda olur; minimum çekim tutarı 100 TL'dir. Gelirinizi artırmak için: birden fazla platformda aktif olun, düzenli olarak portfolyonuzu güncelleyin, hızlı yanıt süresi koruyun ve tamamladığınız her kampanyadan sonra markadan değerlendirme isteyin — yüksek puanlı profiller markalar tarafından çok daha sık tercih ediliyor.",
  },
];

export default function KazancRehberiPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <Badge variant="secondary" className="rounded-full font-normal">
            Creator Kaynakları
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Kazanç Rehberi
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            TRUGC&apos;de creator olarak nasıl kazandığınızı, ödemelerin nasıl işlediğini ve gelirinizi nasıl
            artırabileceğinizi adım adım anlatıyoruz.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <Reveal variant="stagger" staggerChildren={0.1} className="space-y-6">
          {SECTIONS.map((section) => (
            <RevealItem key={section.title}>
              <Card className="rounded-3xl border-border/70 p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                    <section.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold sm:text-xl">{section.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.description}</p>
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
            <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">Kazanmaya bugün başlayın</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">
              Profilinizi oluşturun, paketlerinizi belirleyin ve ilk ödemenizi almaya başlayın.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
                <Link href="/creator-ol">
                  Creator Ol <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link href="/dashboard/creator/earnings">Kazançlarımı Görüntüle</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
