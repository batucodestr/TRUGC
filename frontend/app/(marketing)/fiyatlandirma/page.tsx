import Link from "next/link";
import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/Motion/Reveal";
import { BrandPackages, CommissionNote, CreatorPackages, PackageTrustBar } from "@/components/Pricing/PackageCards";
import { ShareCampaign } from "@/features/marketing/share-campaign";
import { BRAND_PACKAGES, CAMPAIGN_COMMISSION_PERCENT, CREATOR_PACKAGES } from "@/lib/content/packages";
import { PaymentMethods } from "@/components/shared/payment-methods";
import { BankTransferCard } from "@/components/shared/bank-transfer-card";
import { PAYMENT_APPROVAL_MINUTES, PAYMENT_APPROVAL_NOTICE } from "@/lib/company";

export const metadata = { title: "Fiyatlandırma — TRUGC" };

const CREATOR_COMPARISON: { label: string; values: [string | boolean, string | boolean] }[] = [
  { label: "Kampanyaları görüntüleme", values: [true, true] },
  { label: "Kampanyalara başvuru yapma", values: [true, true] },
  { label: "Aylık başvuru hakkı", values: ["22", "50"] },
  { label: "Premium rozet", values: [false, true] },
  { label: "Öne çıkarılmış profil", values: [false, true] },
  { label: "Kampanyalarda öncelik", values: [false, true] },
  { label: "Gelişmiş istatistikler", values: [false, true] },
  { label: "Premium kampanyalara erişim", values: [false, true] },
];

const BRAND_COMPARISON: { label: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { label: "Aktif kampanya sayısı", values: ["5", "15", "Sınırsız"] },
  { label: "Aylık creator başvuru hakkı", values: ["50", "150", "Sınırsız"] },
  { label: "Creator filtreleme", values: ["Temel", "Gelişmiş", "Gelişmiş"] },
  { label: "Öne çıkarılmış kampanyalar", values: [false, true, true] },
  { label: "Raporlama", values: ["Standart", "Detaylı", "Detaylı analiz"] },
  { label: "Özel hesap yöneticisi", values: [false, false, true] },
];

const BILLING_FAQS = [
  {
    id: "billing-1",
    question: "İstediğim zaman iptal edebilir miyim?",
    answer:
      "Evet, paketinizi panelinizden istediğiniz zaman iptal edebilir veya değiştirebilirsiniz. İptal işlemi anında geçerli olur, uzun süreli bir taahhüt verilmez. Süresi devam eden paketin kalan günlerini kullanmaya devam edersiniz.",
  },
  {
    id: "billing-2",
    question: "Creator paketleri ne işe yarar?",
    answer:
      "Creator paketleri, kampanyalara kaç iş başvurusu yapabileceğinizi ve profilinizin ne kadar öne çıkacağını belirler. Classic paket başlangıç için yeterlidir; Premium paket ise premium rozet, öne çıkarılmış profil, başvurularda öncelik ve premium kampanyalara erişim sağlar. TRUGC'ye kayıt olmak ve profil oluşturmak ücretsizdir; paket yalnızca başvuru yapmak için gereklidir.",
  },
  {
    id: "billing-3",
    question: "Kampanya komisyonu nasıl hesaplanır?",
    answer: `Üyelik ücretinden ayrı olarak, marka bir kampanya yayınladığında kampanya bütçesi üzerinden %${CAMPAIGN_COMMISSION_PERCENT} platform komisyonu alınır. Örneğin 5.000 TL bütçeli bir reklam için 500 TL komisyon eklenir. Komisyon, güvenli ödeme altyapısını, kampanya eşleştirmeyi ve platform desteğini kapsar.`,
  },
  {
    id: "billing-4",
    question: "Ödeme yöntemleri nelerdir?",
    answer:
      `Visa ve Mastercard logolu kredi ve banka kartlarıyla ödeme yapabilirsiniz. Ödemeler iyzico güvenli ödeme altyapısı üzerinden, 3D Secure doğrulamasıyla alınır; kart bilgileriniz TRUGC sunucularında saklanmaz. Dilerseniz şirket hesabımıza havale/EFT ile de ödeyebilir, kurumsal hesaplar için fatura karşılığı ödeme talep edebilirsiniz. ${PAYMENT_APPROVAL_NOTICE}`,
  },
  {
    id: "billing-6",
    question: "Ödemem ne kadar sürede onaylanır?",
    answer: `${PAYMENT_APPROVAL_NOTICE} Havale/EFT açıklamasına TRUGC kullanıcı adınızı yazmanız onayı hızlandırır; açıklama eksikse ödemeyi hesabınızla eşleştiremeyiz.`,
  },
  {
    id: "billing-5",
    question: "Ücretsiz üyelik kazanabilir miyim?",
    answer:
      "Evet. TRUGC tanıtım videomuzu Instagram Reels veya TikTok hesabınızda paylaşıp bizi etiketler ve paylaşım bağlantınızı bize gönderirseniz 1 hafta ücretsiz üyelik kazanırsınız. Detaylar bu sayfadaki kampanya kutusunda.",
  },
];

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? <Check className="h-4 w-4 text-violet-600" /> : <X className="h-4 w-4 text-muted-foreground" />;
  }
  return <>{value}</>;
}

export default function FiyatlandirmaPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <p className="text-sm font-medium text-violet-600">Fiyatlandırma</p>
          <h1 className="mx-auto mt-2 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Creator&apos;lar ve markalar için <span className="text-gradient-brand">net paketler</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            TRUGC&apos;ye kayıt olmak ve profil oluşturmak ücretsizdir. Kampanyalara başvurmak ve creator&apos;lara
            ulaşmak için ihtiyacınıza uyan paketi seçin.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal className="mb-6 flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Creator paketleri</h2>
          <p className="text-sm text-muted-foreground">Kampanyalara katıl, markalarla çalış, gelirini artır.</p>
        </Reveal>
        <CreatorPackages />

        <Reveal className="mb-6 mt-16 flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Marka paketleri</h2>
          <p className="text-sm text-muted-foreground">
            Doğru creator&apos;larla çalış, markanı büyüt, satışlarını artır.
          </p>
        </Reveal>
        <BrandPackages />

        <Reveal variant="fade" className="mt-10">
          <CommissionNote />
        </Reveal>

        <Reveal variant="fade" className="mt-6">
          <PackageTrustBar />
        </Reveal>

        {/* Ödeme yöntemleri — iyzico üye iş yeri şartı: ödemenin başladığı
            sayfada iyzico, Visa ve Mastercard logoları görünür olmalıdır. */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Reveal variant="fade" className="h-full">
            <Card className="flex h-full flex-col gap-6 rounded-3xl border-border/70 p-7 shadow-sm">
              <div>
                <h2 className="text-base font-semibold">Güvenli ödeme</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Visa ve Mastercard logolu kredi ve banka kartlarıyla ödeme yapabilirsiniz. Tüm işlemler iyzico
                  güvenli ödeme altyapısı üzerinden, 3D Secure doğrulamasıyla alınır. Fiyatlar Türk Lirası cinsinden
                  ve KDV dahildir. Ödemeniz ortalama {PAYMENT_APPROVAL_MINUTES} dakika içinde onaylanır.{" "}
                  <Link href="/teslimat-ve-iade" className="font-medium text-foreground underline underline-offset-4">
                    Teslimat ve iade koşulları
                  </Link>{" "}
                  ·{" "}
                  <Link
                    href="/mesafeli-satis-sozlesmesi"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Mesafeli satış sözleşmesi
                  </Link>
                </p>
              </div>
              <PaymentMethods showNote={false} className="mt-auto" />
            </Card>
          </Reveal>
          <Reveal variant="fade" delay={0.08} className="h-full">
            <BankTransferCard className="h-full" />
          </Reveal>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-sm font-medium text-violet-600">Karşılaştırma</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Paketleri detaylı karşılaştırın</h2>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <h3 className="mb-4 text-lg font-semibold">Creator paketleri</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-separate border-spacing-0 overflow-hidden rounded-2xl bg-card text-sm shadow-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border/70 px-5 py-4 text-left font-medium text-muted-foreground">
                      Özellik
                    </th>
                    {CREATOR_PACKAGES.map((pkg) => (
                      <th key={pkg.id} className="border-b border-border/70 px-5 py-4 text-left font-semibold">
                        {pkg.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CREATOR_COMPARISON.map((row, idx) => (
                    <tr key={row.label} className={idx % 2 === 1 ? "bg-muted/30" : undefined}>
                      <td className="px-5 py-4 text-muted-foreground">{row.label}</td>
                      {row.values.map((value, i) => (
                        <td key={i} className="px-5 py-4">
                          <ComparisonCell value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="mt-12">
            <h3 className="mb-4 text-lg font-semibold">Marka paketleri</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-0 overflow-hidden rounded-2xl bg-card text-sm shadow-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border/70 px-5 py-4 text-left font-medium text-muted-foreground">
                      Özellik
                    </th>
                    {BRAND_PACKAGES.map((pkg) => (
                      <th key={pkg.id} className="border-b border-border/70 px-5 py-4 text-left font-semibold">
                        {pkg.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BRAND_COMPARISON.map((row, idx) => (
                    <tr key={row.label} className={idx % 2 === 1 ? "bg-muted/30" : undefined}>
                      <td className="px-5 py-4 text-muted-foreground">{row.label}</td>
                      {row.values.map((value, i) => (
                        <td key={i} className="px-5 py-4">
                          <ComparisonCell value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <ShareCampaign />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Faturalandırma</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Faturalandırma hakkında sorular</h2>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <Accordion type="single" collapsible className="w-full">
            {BILLING_FAQS.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="mb-3 rounded-2xl border border-border/70 bg-card px-5 py-1 shadow-sm"
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>
    </div>
  );
}
