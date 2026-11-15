import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const CARDS = [
  { src: "/videos/cosmetics.mp4", views: "256K", style: "left-0 top-6 -rotate-6 z-10" },
  { src: "/videos/fashion.mp4", views: "421K", style: "left-24 -top-2 z-20 rotate-0" },
  { src: "/videos/skincare.mp4", views: "198K", style: "left-48 top-6 rotate-6 z-10" },
];

/** Mor gradient geniş CTA kartı: eğik video kartları + başlık + beyaz buton. */
export function CtaBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#5b21b6_0%,#8b3dff_45%,#c026d3_100%)] px-6 py-8 shadow-[0_20px_60px_rgb(139_61_255/0.35)] sm:px-10 lg:min-h-[180px]">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgb(255_255_255/0.22),transparent_55%)]" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[300px_1fr_auto]">
          <div className="relative hidden h-36 lg:block" aria-hidden>
            {CARDS.map((c) => (
              <div key={c.src} className={`absolute h-36 w-24 overflow-hidden rounded-xl border-2 border-white/60 shadow-xl ${c.style}`}>
                <video className="h-full w-full object-cover" src={c.src} autoPlay muted loop playsInline />
                <span className="absolute bottom-1 left-1.5 flex items-center gap-1 text-[11px] font-bold text-white drop-shadow">
                  <Play className="h-2.5 w-2.5 fill-white" /> {c.views}
                </span>
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Markanız için UGC içerik mi arıyorsunuz?</h2>
            <p className="mt-2 max-w-md text-white/85">Binlerce doğrulanmış içerik üreticisi arasından sizinle en uyumlu olanları seçin.</p>
          </div>
          <Button variant="white" size="lg" className="w-fit text-violet-800" asChild>
            <Link href="/dashboard/brand/campaigns/new">
              Hemen Kampanya Oluştur <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
