"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  UserCircle,
  Wallet,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Building2,
  ArrowRight,
  LifeBuoy,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";
import { SearchBar } from "@/components/Search/SearchBar";
import { EmptyState } from "@/components/shared/empty-state";
import { FAQS } from "@/lib/content/marketing";

const HELP_TOPICS = [
  {
    icon: UserCircle,
    title: "Hesap ve Profil",
    description: "Profil bilgilerinizi güncelleme, şifre işlemleri ve hesap ayarlarıyla ilgili tüm sorular.",
  },
  {
    icon: Wallet,
    title: "Ödemeler",
    description: "Ödeme yöntemleri, komisyon oranları, fatura ve para transferi süreçleri hakkında bilgi alın.",
  },
  {
    icon: Megaphone,
    title: "Kampanyalar",
    description: "Kampanya oluşturma, başvuru yönetimi ve teslimat süreçlerine dair rehberler.",
  },
  {
    icon: ShieldCheck,
    title: "Doğrulama",
    description: "Onaylı rozet süreci, kimlik ve işletme belgesi doğrulama adımları.",
  },
  {
    icon: Sparkles,
    title: "Creator'lar için",
    description: "Profil oluşturma, paket fiyatlandırma ve marka iş birlikleriyle ilgili ipuçları.",
  },
  {
    icon: Building2,
    title: "Markalar için",
    description: "Doğru creator'ı bulma, kampanya yönetimi ve ekip erişimi konularında destek.",
  },
];

export default function YardimMerkeziPage() {
  const [query, setQuery] = useState("");

  const { topics, faqs } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { topics: HELP_TOPICS, faqs: [] as typeof FAQS };
    return {
      topics: HELP_TOPICS.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
      faqs: FAQS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)),
    };
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const hasResults = topics.length > 0 || faqs.length > 0;

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <p className="text-sm font-medium text-violet-600">Yardım Merkezi</p>
          <h1 className="mx-auto mt-2 max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Size nasıl <span className="text-gradient-brand">yardımcı olabiliriz?</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            Hesabınız, ödemeleriniz veya kampanyalarınızla ilgili aradığınız cevaplara aşağıdan hızlıca ulaşın.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mx-auto mt-8 max-w-xl">
          <SearchBar placeholder="Nasıl yardımcı olabiliriz?" value={query} onChange={setQuery} />
        </Reveal>
      </section>

      {hasQuery && !hasResults ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <EmptyState
            icon={SearchX}
            title="Sonuç bulunamadı"
            description={`"${query}" için bir sonuç bulamadık. Farklı bir kelimeyle tekrar deneyin veya destek ekibimizle iletişime geçin.`}
            action={
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/iletisim">Bize ulaşın</Link>
              </Button>
            }
          />
        </section>
      ) : (
        <>
          {hasQuery && faqs.length > 0 && (
            <section className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-8">
              <h2 className="text-sm font-semibold text-muted-foreground">SSS sonuçları ({faqs.length})</h2>
              <div className="mt-4 space-y-3">
                {faqs.map((faq) => (
                  <Card key={faq.id} className="rounded-2xl border-border/70 p-5">
                    <p className="text-sm font-semibold">{faq.question}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{faq.answer}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            {hasQuery && <h2 className="mb-5 text-sm font-semibold text-muted-foreground">Konular ({topics.length})</h2>}
            <Reveal variant="stagger" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <RevealItem key={topic.title}>
                  <Link href="/sss" className="block h-full">
                    <Card className="h-full rounded-3xl border-border/70 p-6 shadow-sm transition-shadow hover:shadow-md">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                        <topic.icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 text-lg font-semibold">{topic.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{topic.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-600">
                        Yardım makalelerini görüntüle <ArrowRight className="h-4 w-4" />
                      </span>
                    </Card>
                  </Link>
                </RevealItem>
              ))}
            </Reveal>
          </section>
        </>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 lg:px-8">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-4xl bg-gradient-brand px-8 py-16 text-center shadow-2xl shadow-violet-600/30 sm:px-16">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]"
            />
            <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
              <LifeBuoy className="h-6 w-6" />
            </span>
            <h2 className="relative mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Hâlâ yardıma mı ihtiyacın var?
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/85">
              Aradığınız cevabı bulamadıysanız destek ekibimiz size yardımcı olmaktan mutluluk duyar.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
                <Link href="/iletisim">
                  Bize Ulaşın <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20"
                asChild
              >
                <Link href="/sss">Sıkça Sorulan Sorular</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
