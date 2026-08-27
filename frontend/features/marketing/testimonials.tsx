import Image from "next/image";
import { Star, Quote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";
import { TESTIMONIALS } from "@/lib/content/marketing";

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="text-center">
        <p className="text-sm font-medium text-violet-600">Değerlendirmeler</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Hem markaların hem creator&apos;ların gözdesi</h2>
      </Reveal>

      <Reveal variant="stagger" className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.map((t) => (
          <RevealItem key={t.id}>
            <Card className="flex h-full flex-col justify-between rounded-3xl border-border/70 p-6 shadow-sm">
              <div>
                <Quote className="h-6 w-6 text-violet-600/40" />
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">{t.quote}</p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <Image src={t.avatarUrl} alt={t.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role} · {t.company}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star key={idx} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </Card>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}
