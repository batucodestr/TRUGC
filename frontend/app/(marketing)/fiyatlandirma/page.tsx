import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/Motion/Reveal";
import { formatCurrency, convertUsdToTry } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Fiyatlandırma — TRUGC" };

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "ay",
    description: "Influencer pazarlamasına yeni başlayan markalar için.",
    features: ["2 aktif kampanyaya kadar", "Temel creator arama", "Standart mesajlaşma", "Topluluk desteği"],
    ctaLabel: "Ücretsiz başla",
  },
  {
    id: "growth",
    name: "Growth",
    price: 149,
    period: "ay",
    description: "Her ay yeni creator iş birlikleri kuran büyüyen markalar için.",
    features: [
      "Sınırsız aktif kampanya",
      "Gelişmiş filtreler ve analitik",
      "Öncelikli creator eşleştirme",
      "Özel hesap desteği",
      "Kampanya performans raporları",
    ],
    highlighted: true,
    ctaLabel: "Ücretsiz deneyin",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    period: "ay",
    description: "Yüksek hacimli kampanyalar yürüten ajanslar ve büyük ekipler için.",
    features: [
      "Growth planındaki her şey",
      "Çoklu kullanıcı erişimi",
      "Özel sözleşme ve faturalandırma",
      "API erişimi",
      "Uçtan uca kurulum desteği",
    ],
    ctaLabel: "Satış ekibiyle görüşün",
  },
];

const COMPARISON_ROWS: { label: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { label: "Aktif kampanya sayısı", values: ["2", "Sınırsız", "Sınırsız"] },
  { label: "Creator arama filtreleri", values: ["Temel", "Gelişmiş", "Gelişmiş"] },
  { label: "Öncelikli eşleştirme", values: [false, true, true] },
  { label: "Özel hesap yöneticisi", values: [false, false, true] },
  { label: "API erişimi", values: [false, false, true] },
];

const BILLING_FAQS = [
  {
    id: "billing-1",
    question: "İstediğim zaman iptal edebilir miyim?",
    answer:
      "Evet, planınızı marka panelinizden istediğiniz zaman iptal edebilir veya değiştirebilirsiniz. İptal işlemi anında geçerli olur ve ek bir taahhüt gerekmez.",
  },
  {
    id: "billing-2",
    question: "Creator olmak ücretli mi?",
    answer:
      "Hayır, creator'lar için platform tamamen ücretsizdir. Yukarıdaki planlar yalnızca markalar içindir; creator'lar herhangi bir üyelik ücreti ödemeden TRUGC'ye katılabilir.",
  },
  {
    id: "billing-3",
    question: "Ödeme yöntemleri nelerdir?",
    answer:
      "Kredi kartı, banka kartı ve banka havalesi ile ödeme yapabilirsiniz. Kurumsal hesaplar için fatura karşılığı ödeme de desteklenmektedir.",
  },
  {
    id: "billing-4",
    question: "Yıllık ödemede indirim var mı?",
    answer:
      "Evet, planınızı yıllık olarak ödemeyi seçtiğinizde tüm ücretli planlarda %20 indirim uygulanır.",
  },
];

export default function FiyatlandirmaPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <p className="text-sm font-medium text-violet-600">Fiyatlandırma</p>
          <h1 className="mx-auto mt-2 max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Her büyüklükteki marka için <span className="text-gradient-brand">basit planlar</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            Creator&apos;lar için katılım ve kampanyaları görüntüleme her zaman ücretsizdir. Markalar için ihtiyacınıza
            uygun planı seçin.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.id} variant="scale" delay={i * 0.08} className={cn("relative h-full", plan.highlighted && "md:-translate-y-3")}>
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-brand px-3 py-1 text-xs font-medium text-white shadow">
                  En popüler
                </span>
              )}
              <Card
                className={cn(
                  "flex h-full flex-col rounded-3xl border-border/70 p-7 shadow-sm",
                  plan.highlighted && "border-violet-600 shadow-xl shadow-violet-600/15",
                )}
              >
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">
                    {plan.price === 0 ? "Ücretsiz" : formatCurrency(convertUsdToTry(plan.price))}
                  </span>
                  {plan.price > 0 && <span className="text-sm text-muted-foreground">/{plan.period}</span>}
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn("mt-7 rounded-full", plan.highlighted ? "bg-gradient-brand hover:opacity-90" : "")}
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link href="/dashboard/brand">{plan.ctaLabel}</Link>
                </Button>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-sm font-medium text-violet-600">Karşılaştırma</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Planları detaylı karşılaştırın</h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 overflow-hidden rounded-2xl bg-card text-sm shadow-sm">
              <thead>
                <tr>
                  <th className="border-b border-border/70 px-5 py-4 text-left font-medium text-muted-foreground">
                    Özellik
                  </th>
                  {PLANS.map((plan) => (
                    <th
                      key={plan.id}
                      className="border-b border-border/70 px-5 py-4 text-left font-semibold"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={row.label} className={idx % 2 === 1 ? "bg-muted/30" : undefined}>
                    <td className="px-5 py-4 text-muted-foreground">{row.label}</td>
                    {row.values.map((value, i) => (
                      <td key={i} className="px-5 py-4">
                        {typeof value === "boolean" ? (
                          value ? (
                            <Check className="h-4 w-4 text-violet-600" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
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
