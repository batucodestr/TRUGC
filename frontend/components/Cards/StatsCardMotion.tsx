"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

/** Viewport-reveal + hover-lift wrapper for StatsCard. Kept separate so StatsCard itself can stay a Server Component. */
export function StatsCardMotion({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
