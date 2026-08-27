"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  strength?: number;
  className?: string;
  glow?: boolean;
}

/**
 * Wraps any button/link so it subtly attracts toward the cursor and eases
 * back on leave, with an optional soft glow. Wrap existing CTAs with this —
 * don't restyle them, just give them the interaction.
 */
export function MagneticButton({ children, strength = 0.35, className, glow = true }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    x.set(relX * strength);
    y.set(relY * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    setHovered(false);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={cn("relative inline-block", className)}
    >
      {glow && (
        <motion.span
          aria-hidden
          animate={{ opacity: hovered ? 0.55 : 0, scale: hovered ? 1.15 : 0.9 }}
          transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="pointer-events-none absolute -inset-2 -z-10 rounded-full bg-violet-500/40 blur-xl"
        />
      )}
      {children}
    </motion.div>
  );
}
