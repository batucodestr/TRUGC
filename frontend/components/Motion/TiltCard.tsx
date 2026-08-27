"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees on either axis. */
  maxTilt?: number;
  glowColor?: string;
}

/**
 * Reusable 3D hover-tilt wrapper: subtle rotateX/rotateY toward the cursor,
 * a soft radial glow that follows it, and an expanding shadow on hover.
 * Used by creator cards, feature cards, and dashboard preview panels.
 */
export function TiltCard({ children, className, maxTilt = 6, glowColor = "124,58,237" }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 25 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const glowBg = useMotionTemplate`radial-gradient(220px circle at ${glowX}% ${glowY}%, rgba(${glowColor},0.35), transparent 70%)`;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * maxTilt * 2);
    rotateX.set((0.5 - py) * maxTilt * 2);
    glowX.set(px * 100);
    glowY.set(py * 100);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div className="group [perspective:1000px]">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={cn("relative transition-shadow duration-300 group-hover:shadow-2xl", className)}
      >
        <motion.div
          aria-hidden
          style={{ background: glowBg }}
          className="pointer-events-none absolute -inset-px z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        {children}
      </motion.div>
    </div>
  );
}
