import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/Motion/Reveal";
import { PRICING_PLANS } from "@/lib/content/marketing";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="border-y border-border/60 bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Fiyatlandırma</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Her büyüklükteki marka için basit planlar</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Creator&apos;lar için katılım ve kampanyaları görüntüleme her zaman ücretsizdir.</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => (
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
                  <span className="text-4xl font-semibold tracking-tight">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">/{plan.period}</span>
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
      </div>
    </section>
  );
}
