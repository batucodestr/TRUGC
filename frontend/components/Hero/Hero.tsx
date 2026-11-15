import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, Layers, Play, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstagramIcon, TikTokIcon, YoutubeIcon } from "@/components/shared/brand-icons";
import { IntroVideoButton } from "./IntroVideoButton";

const STATS = [
  { icon: Users, value: "12.400+", label: "İçerik Üreticisi" },
  { icon: Layers, value: "2.900+", label: "Marka" },
  { icon: BarChart3, value: "%184", label: "Ortalama Etkileşim Artışı" },
];

/** Yüzen sosyal ikon rozeti: hafif eğik, glow'lu, yavaş float animasyonlu. */
function FloatBadge({ className, tilt, delay = "0s", children }: { className: string; tilt: string; delay?: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className={`animate-float absolute flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_10px_30px_rgb(139_61_255/0.45)] sm:h-20 sm:w-20 ${className}`}
      style={{ ["--tilt" as string]: tilt, animationDelay: delay }}
    >
      {children}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-10 pt-10 sm:pt-16">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
        {/* Sol: metin */}
        <div className="relative z-10">
          <div className="glass-panel inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white/90">
            <Zap className="h-4 w-4 text-brand-light" aria-hidden />
            Türkiye&apos;nin UGC &amp; Creator Pazaryeri
          </div>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.1] tracking-[-0.02em] [word-spacing:0.06em] text-white sm:text-6xl">
            Markalar ile
            <br />
            İçerik Üreticilerini
            <br />
            <span className="text-gradient-brand">Buluşturuyoruz</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-text-soft sm:text-lg">
            Gerçek içerik, gerçek etkileşim, gerçek sonuç. TRUGC ile markanız için yaratıcı içerikler ürettirin, hedef
            kitlenize daha hızlı ulaşın.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/register">
                Hemen Başla <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <IntroVideoButton />
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="h-9 w-9 text-brand-light" strokeWidth={1.5} aria-hidden />
                <div>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-xl font-extrabold leading-none text-white">{value}</dd>
                  <p className="mt-1 text-sm text-text-soft">{label}</p>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Sağ: mor daire + telefon + yüzen ikonlar */}
        <div className="relative mx-auto h-[420px] w-full max-w-[560px] sm:h-[520px]">
          <div aria-hidden className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgb(139_61_255/0.55),rgb(124_58_237/0.25)_55%,transparent_72%)] blur-[2px] sm:h-[470px] sm:w-[470px]" />
          <div aria-hidden className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-light/30 sm:h-[420px] sm:w-[420px]" />

          {/* Telefon (gerçek creator videosu) */}
          <div className="absolute left-1/2 top-1/2 h-[330px] w-[170px] -translate-x-1/2 -translate-y-1/2 -rotate-6 overflow-hidden rounded-[2rem] border-[6px] border-[#2a2540] bg-[linear-gradient(160deg,#7c3aed,#c026d3_70%,#1a1033)] shadow-[0_30px_80px_rgb(139_61_255/0.45)] sm:h-[410px] sm:w-[210px]">
            <video className="h-full w-full object-cover" poster="" src="/videos/phone.mp4" autoPlay muted loop playsInline aria-hidden />
            <div className="absolute inset-x-0 top-0 mx-auto mt-1.5 h-5 w-20 rounded-full bg-black" aria-hidden />
          </div>

          <FloatBadge className="left-[8%] top-[18%] bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]" tilt="-8deg">
            <InstagramIcon className="h-9 w-9 text-white" />
          </FloatBadge>
          <FloatBadge className="left-[2%] top-[46%] border border-white/10 bg-[#0e0c1a]" tilt="8deg" delay="1.2s">
            <TikTokIcon className="h-9 w-9 text-white" />
          </FloatBadge>
          <FloatBadge className="right-[6%] top-[44%] bg-gradient-to-br from-[#ff2a2a] to-[#c40000]" tilt="10deg" delay="0.6s">
            <YoutubeIcon className="h-9 w-9 text-white" />
          </FloatBadge>
          <FloatBadge className="bottom-[22%] right-[2%] bg-gradient-brand" tilt="-10deg" delay="1.8s">
            <Play className="h-8 w-8 fill-white text-white" aria-hidden />
          </FloatBadge>

          {/* Kampanya sonucu kartı */}
          <div className="glass-panel animate-float absolute right-0 top-0 w-52 -rotate-3 rounded-2xl p-4 shadow-xl" style={{ ["--tilt" as string]: "-3deg" }}>
            <p className="text-xs font-semibold text-white/90">Kampanya Sonucu</p>
            <div className="mt-2 flex items-center gap-3">
              <TrendingUp className="h-10 w-10 text-success" strokeWidth={2.2} aria-hidden />
              <div>
                <p className="text-2xl font-extrabold text-success">+%184</p>
                <p className="text-xs text-text-soft">Etkileşim</p>
              </div>
            </div>
          </div>

          {/* Profil kartı */}
          <div className="glass-panel absolute bottom-2 left-1/2 flex w-[88%] max-w-[360px] -translate-x-1/2 items-center gap-3 rounded-2xl p-3 pr-5 shadow-xl backdrop-blur-xl">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white" aria-hidden>
              C
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-bold text-white">
                @cerenugc <BadgeCheck className="h-4 w-4 fill-verified text-white" aria-label="Doğrulanmış" />
              </p>
              <p className="text-xs text-text-soft">UGC Creator</p>
            </div>
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 text-sm font-bold text-white">
              <Play className="h-3.5 w-3.5 fill-white" aria-hidden /> 85.4K
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
