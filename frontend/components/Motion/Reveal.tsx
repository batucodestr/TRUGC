"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RevealVariant = "fade" | "slide-up" | "scale" | "stagger";

interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  /** For variant="stagger": delay applied between each direct child. */
  staggerChildren?: number;
  once?: boolean;
}

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const VARIANTS: Record<Exclude<RevealVariant, "stagger">, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "slide-up": {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Single reusable scroll-reveal primitive. Every section on the site
 * should compose this instead of hand-rolling its own whileInView motion.
 */
export function Reveal({
  children,
  variant = "slide-up",
  delay = 0,
  duration = 0.6,
  className,
  staggerChildren = 0.08,
  once = true,
}: RevealProps) {
  if (variant === "stagger") {
    return (
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: "-80px" }}
        transition={{ staggerChildren, delayChildren: delay }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
      variants={VARIANTS[variant]}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Direct child of a variant="stagger" Reveal — inherits the parent's stagger timing. */
export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} transition={{ duration: 0.55, ease: EASE }} className={cn(className)}>
      {children}
    </motion.div>
  );
}
