import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";
import { listFeaturedBrands } from "@/lib/api/brands";

export const metadata = { title: "Başarı Hikayeleri — TRUGC" };

// Narrative copy is marketing content, not backend data — matched to whichever
// brands come back from the API by position (index), not by a fabricated slug.
const CASE_STUDIES = [
  {
    narrative:
      "Yeni ürün lansmanı için 40'tan fazla cilt bakımı creator'ıyla eş zamanlı çalıştı, organik erişimi üç ayda katladı.",
    stat: "+184%",
    statLabel: "Etkileşim artışı",
  },
  {
    narrative:
      "Sezonluk koleksiyon kampanyasında micro-influencer ağırlıklı bir strateji kurdu ve reklam bütçesini büyük ölçüde azalttı.",
    stat: "%67",
    statLabel: "Daha düşük müşteri edinme maliyeti",
  },
  {
    narrative:
      "Outdoor ekipman serisini tanıtmak için doğa ve seyahat niş'inde onaylı creator'larla altı haftalık bir kampanya yürüttü.",
    stat: "3 Ayda 40+",
    statLabel: "İş birliği yapılan creator",
  },
  {
    narrative:
      "Gıda markası, yemek ve yaşam tarzı creator'larıyla çalışarak yeni ürün serisinin ilk ayında satışlarını ikiye katladı.",
    stat: "+212%",
    statLabel: "Satış artışı",
  },
  {
    narrative:
      "Fitness topluluğu oluşturmak için haftalık içerik takvimiyle uzun soluklu bir creator iş birliği programı başlattı.",
    stat: "58K+",
    statLabel: "Yeni takipçi",
  },
];

export default async function BasariHikayeleriPage() {
  const brands = await listFeaturedBrands(CASE_STUDIES.length);
  const cases = CASE_STUDIES.map((c, i) => ({
    ...c,
    brand: brands[i],
  })).filter((c) => c.brand);

  return (
    <div>
      <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,theme(colors.violet.200/0.35),transparent_60%)]"
        />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-sm font-medium text-violet-600">Başarı Hikayeleri</p>
            <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              TRUGC&apos;de <span className="text-gradient-brand">büyüyen markalar</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
              Platformumuzda kampanya yürüten markaların creator iş birlikleriyle elde ettiği gerçek sonuçlara göz at.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal variant="stagger" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <RevealItem key={c.brand!.id}>
              <Card className="flex h-full flex-col rounded-3xl border-border/70 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  {c.brand!.logoUrl && (
                    <Image
                      src={c.brand!.logoUrl}
                      alt={c.brand!.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-xl object-cover"
                    />
                  )}
                  <p className="font-semibold">{c.brand!.name}</p>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{c.narrative}</p>
                <div className="mt-6 border-t border-border/60 pt-4">
                  <p className="text-3xl font-semibold text-gradient-brand">{c.stat}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.statLabel}</p>
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
              Sen de başarı hikayeni yaz
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">
              Markanı doğru creator&apos;larla buluştur, kampanyanı yönet ve sonuçları gözlerinle gör.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
                <Link href="/marka-cozumleri">
                  Marka Çözümlerini İncele <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
