import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Motion/Reveal";

export function Cta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <Reveal variant="scale">
        <div className="relative overflow-hidden rounded-4xl bg-gradient-brand px-8 py-16 text-center shadow-2xl shadow-violet-600/30 sm:px-16">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Doğru creator&apos;larla büyümeye hazır mısınız?
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/85">
            TRUGC&apos;de zaten iş birliği yapan binlerce marka ve creator&apos;a katılın.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full bg-white text-violet-700 hover:bg-white/90" asChild>
              <Link href="/creators">
                İçerik Üreticileri Keşfet <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20" asChild>
              <Link href="/dashboard/creator">Creator Olarak Katıl</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
