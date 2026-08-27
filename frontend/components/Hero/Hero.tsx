"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Play, TrendingUp, Sparkles as SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/Search/SearchBar";
import { MagneticButton } from "@/components/Motion/MagneticButton";
import { HeroHeadline } from "./HeroHeadline";
import { WebglErrorBoundary } from "./WebglErrorBoundary";
import { CATEGORIES, CATEGORY_LABEL_TR } from "@/lib/constants";

const HeroBackground = dynamic(() => import("./HeroBackground").then((m) => m.HeroBackground), {
  ssr: false,
  loading: () => null,
});

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/creators?search=${encodeURIComponent(q)}` : "/creators");
  }

  // Cinematic exit: the WebGL backdrop eases out and scales up slightly as
  // the hero scrolls past, so the next section blends in rather than cutting.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = sectionRef.current;
    const bg = bgRef.current;
    if (!section || !bg) return;

    const ctx = gsap.context(() => {
      gsap.to(bg, {
        opacity: 0.15,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden pb-24 pt-16 sm:pt-24">
      <div ref={bgRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <WebglErrorBoundary>
          <HeroBackground />
        </WebglErrorBoundary>
        <div className="bg-noise absolute inset-0 opacity-[0.03] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,theme(colors.border)_1px,transparent_0)] bg-[size:36px_36px] opacity-25 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel mx-auto mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Bu yıl 12.400+ onaylı içerik üreticisi katıldı
        </motion.div>

        <HeroHeadline
          text="Bir sonraki kampanyan için mükemmel içerik üreticisini bul"
          gradientWords={["kampanyan"]}
          delay={0.1}
          className="mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
        >
          TRUGC, markaları Instagram, TikTok, YouTube ve Twitch&apos;teki onaylı içerik üreticileriyle buluşturur —
          keşiften ödemeye kadar her şey tek bir yerde.
        </motion.p>

        <motion.form
          onSubmit={handleSearchSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <SearchBar value={query} onChange={setQuery} />
          <MagneticButton>
            <Button type="submit" size="lg" className="h-12 shrink-0 rounded-full bg-gradient-brand px-6 shadow-lg shadow-violet-600/30 hover:opacity-90">
              İçerik Üreticileri Keşfet <ArrowRight className="h-4 w-4" />
            </Button>
          </MagneticButton>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          {CATEGORIES.slice(0, 6).map((cat) => (
            <Link
              key={cat}
              href={`/creators?category=${cat}`}
              className="rounded-full border border-border bg-background/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:border-violet-600 hover:text-violet-600"
            >
              {CATEGORY_LABEL_TR[cat]}
            </Link>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <div className="flex items-center gap-3">
            <Image
              src="/logo-mark.png"
              alt="TRUGC"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full border-2 border-background object-contain shadow-sm sm:h-10 sm:w-10"
            />
            <span className="text-sm font-medium text-muted-foreground">Markalar ve creator&apos;lar için tek platform</span>
          </div>
          <button className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:scale-105">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
            Nasıl çalıştığını izle
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.15, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative mx-auto mt-16 hidden max-w-3xl gap-4 sm:flex"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="glass-panel flex flex-1 items-center gap-3 rounded-2xl px-5 py-4 text-left shadow-xl"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Ort. etkileşim artışı</p>
              <p className="text-lg font-semibold">+184%</p>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            className="glass-panel flex flex-1 items-center gap-3 rounded-2xl px-5 py-4 text-left shadow-xl"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/15 text-violet-600">
              <SparklesIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Başlatılan kampanya</p>
              <p className="text-lg font-semibold">38,200+</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
