"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import { Reveal } from "@/components/Motion/Reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CardHeight = "tall" | "medium" | "short";

interface FeedVideo {
  id: string;
  src: string;
  category: string;
  caption: string;
  priceLabel: string;
  height: CardHeight;
}

const HEIGHT_CLASS: Record<CardHeight, string> = {
  tall: "aspect-[9/16]",
  medium: "aspect-[4/5]",
  short: "aspect-[3/4]",
};

// Sütunlara dağıtılmış videolar — her sütun farklı yükseklik örüntüsüyle
// Pinterest tarzı bir masonry hissi verir (bkz. HEIGHT_CLASS).
const COLUMNS: FeedVideo[][] = [
  [
    { id: "coffee", src: "/videos/coffee.mp4", category: "Kahve", caption: "Kahve markaları için lezzetli b-roll içerikler", priceLabel: "750 ₺'den başlayan fiyatlarla", height: "tall" },
    { id: "cosmetics", src: "/videos/cosmetics.mp4", category: "Kozmetik", caption: "Makyaj ve kozmetik ürün tanıtımları", priceLabel: "900 ₺'den başlayan fiyatlarla", height: "short" },
  ],
  [
    { id: "skincare", src: "/videos/skincare.mp4", category: "Cilt Bakımı", caption: "Cilt bakım rutini içerikleri", priceLabel: "850 ₺'den başlayan fiyatlarla", height: "short" },
    { id: "pets", src: "/videos/pets.mp4", category: "Evcil Hayvan", caption: "Evcil hayvan markaları için samimi içerikler", priceLabel: "600 ₺'den başlayan fiyatlarla", height: "tall" },
  ],
  [
    { id: "lifestyle", src: "/videos/lifestyle.mp4", category: "Lifestyle", caption: "Yaşam tarzı ve günlük estetik içerikler", priceLabel: "700 ₺'den başlayan fiyatlarla", height: "medium" },
    { id: "phone", src: "/videos/phone.mp4", category: "Teknoloji", caption: "Telefon ve teknoloji ürünleri için içerikler", priceLabel: "950 ₺'den başlayan fiyatlarla", height: "tall" },
  ],
  [
    { id: "daily-life", src: "/videos/daily-life.mp4", category: "Günlük Yaşam", caption: "Günlük yaşamdan otantik anlar", priceLabel: "650 ₺'den başlayan fiyatlarla", height: "tall" },
    { id: "fashion", src: "/videos/fashion.mp4", category: "Moda", caption: "Moda ve stil odaklı içerik üretimi", priceLabel: "800 ₺'den başlayan fiyatlarla", height: "medium" },
  ],
];

function VideoCard({ video }: { video: FeedVideo }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const videoEl = videoRef.current;
    const container = containerRef.current;
    if (!videoEl || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative w-full shrink-0 overflow-hidden rounded-3xl bg-muted shadow-sm transition-shadow duration-300 hover:shadow-2xl hover:shadow-violet-600/20",
        HEIGHT_CLASS[video.height],
      )}
    >
      <video
        ref={videoRef}
        src={video.src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/0" />

      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-violet-700 shadow">
        {video.category}
      </span>

      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Sesi aç" : "Sesi kapat"}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
      >
        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-sm font-medium leading-snug text-white">{video.caption}</p>
        <p className="mt-1 text-xs text-white/75">{video.priceLabel}</p>
      </div>
    </div>
  );
}

export function VideoFeed() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-violet-600">İçerikleri keşfet</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Gerçek creator içeriklerinden ilham al</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Kahveden kozmetiğe, evcil hayvandan teknolojiye — TRUGC&apos;deki creator&apos;ların ürettiği tarza bir bakış.
          </p>
        </div>
        <Button variant="outline" className="rounded-full shrink-0" asChild>
          <Link href="/creators">
            Tüm creator&apos;ları keşfet <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Reveal>

      <div
        className={cn(
          "no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:gap-5",
          "[mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]",
        )}
      >
        {COLUMNS.map((column, colIndex) => (
          <div
            key={colIndex}
            className={cn(
              "flex w-[42vw] shrink-0 snap-center flex-col gap-4 sm:w-[220px] sm:gap-5",
              colIndex % 2 === 1 && "mt-10 sm:mt-16",
            )}
          >
            {column.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
