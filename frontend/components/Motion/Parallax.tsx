"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

interface ParallaxProps {
  children: React.ReactNode;
  /** Pixels of vertical travel across the scroll range. Negative moves up. */
  speed?: number;
  className?: string;
}

/** Depth-based parallax layer driven by GSAP ScrollTrigger (scrub). Keep speed subtle — under ~60px. */
export function Parallax({ children, speed = -40, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        y: speed,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    });

    return () => ctx.revert();
  }, [speed]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
