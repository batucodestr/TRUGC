"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
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

const TOP_TRACK: FeedVideo[] = [
  { id: "coffee", src: "/videos/coffee.mp4", category: "Kahve", caption: "Kahve markaları için lezzetli b-roll içerikler", priceLabel: "750 ₺'den başlayan fiyatlarla", height: "tall" },
  { id: "cosmetics", src: "/videos/cosmetics.mp4", category: "Kozmetik", caption: "Makyaj ve kozmetik ürün tanıtımları", priceLabel: "900 ₺'den başlayan fiyatlarla", height: "short" },
  { id: "skincare", src: "/videos/skincare.mp4", category: "Cilt Bakımı", caption: "Cilt bakım rutini içerikleri", priceLabel: "850 ₺'den başlayan fiyatlarla", height: "medium" },
  { id: "pets", src: "/videos/pets.mp4", category: "Evcil Hayvan", caption: "Evcil hayvan markaları için samimi içerikler", priceLabel: "600 ₺'den başlayan fiyatlarla", height: "tall" },
];

const BOTTOM_TRACK: FeedVideo[] = [
  { id: "lifestyle", src: "/videos/lifestyle.mp4", category: "Lifestyle", caption: "Yaşam tarzı ve günlük estetik içerikler", priceLabel: "700 ₺'den başlayan fiyatlarla", height: "short" },
  { id: "phone", src: "/videos/phone.mp4", category: "Teknoloji", caption: "Telefon ve teknoloji ürünleri için içerikler", priceLabel: "950 ₺'den başlayan fiyatlarla", height: "tall" },
  { id: "daily-life", src: "/videos/daily-life.mp4", category: "Günlük Yaşam", caption: "Günlük yaşamdan otantik anlar", priceLabel: "650 ₺'den başlayan fiyatlarla", height: "medium" },
  { id: "fashion", src: "/videos/fashion.mp4", category: "Moda", caption: "Moda ve stil odaklı içerik üretimi", priceLabel: "800 ₺'den başlayan fiyatlarla", height: "short" },
];

function VideoCard({ video, viewportRef }: { video: FeedVideo; viewportRef: RefObject<HTMLDivElement | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const videoEl = videoRef.current;
    const cardEl = cardRef.current;
    const root = viewportRef.current;
    if (!videoEl || !cardEl || !root) return;

    // root'u sayfa viewport'u yerine track'in kırpan (overflow-hidden) kutusu
    // olarak veriyoruz, böylece kart CSS transform ile track dışına
    // kaydığında da (sayfa açısından hâlâ "görünür" olsa bile) duraklatılır.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoEl.play().catch(() => {});
        } else {
          videoEl.pause();
        }
      },
      { root, threshold: 0.4 },
    );
    observer.observe(cardEl);
    return () => observer.disconnect();
  }, [viewportRef]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative w-[170px] shrink-0 select-none overflow-hidden rounded-3xl bg-muted shadow-sm transition-shadow duration-300 hover:shadow-2xl hover:shadow-violet-600/20 sm:w-[200px]",
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
        draggable={false}
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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
        <p className="text-sm font-medium leading-snug text-white">{video.caption}</p>
        <p className="mt-1 text-xs text-white/75">{video.priceLabel}</p>
      </div>
    </div>
  );
}

function MarqueeTrack({ videos, direction }: { videos: FeedVideo[]; direction: "left" | "right" }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef({ pointerX: 0, baseX: 0 });

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = { pointerX: e.clientX, baseX: dragX };
    setDragging(true);
    setPaused(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const delta = e.clientX - dragStart.current.pointerX;
    setDragX(dragStart.current.baseX + delta);
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    setPaused(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const doubled = [...videos, ...videos];

  return (
    <div
      ref={viewportRef}
      className="touch-pan-y relative w-full cursor-grab overflow-hidden active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => !dragging && setPaused(false)}
    >
      <div style={{ transform: `translateX(${dragX}px)` }}>
        <div
          className={cn(
            "flex w-max gap-4 [will-change:transform] sm:gap-5",
            direction === "right" ? "animate-[marquee-reverse_22s_linear_infinite]" : "animate-[marquee_22s_linear_infinite]",
          )}
          style={{ animationPlayState: paused ? "paused" : "running" }}
        >
          {doubled.map((video, i) => (
            <VideoCard key={`${video.id}-${i}`} video={video} viewportRef={viewportRef} />
          ))}
        </div>
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
          "mt-10 space-y-4 sm:space-y-5",
          "[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]",
        )}
      >
        <MarqueeTrack videos={TOP_TRACK} direction="right" />
        <MarqueeTrack videos={BOTTOM_TRACK} direction="left" />
      </div>
    </section>
  );
}
