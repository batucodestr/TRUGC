"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroHeadlineProps {
  text: string;
  gradientWords?: string[];
  delay?: number;
  className?: string;
}

const container = {
  hidden: {},
  visible: (delay: number) => ({
    transition: { staggerChildren: 0.07, delayChildren: delay },
  }),
};

const word = {
  hidden: { opacity: 0, y: "0.6em", filter: "blur(6px)" },
  visible: { opacity: 1, y: "0em", filter: "blur(0px)" },
};

/** Word-by-word headline reveal — deliberately not a typewriter effect. */
export function HeroHeadline({ text, gradientWords = [], delay = 0, className }: HeroHeadlineProps) {
  const words = text.split(" ");

  return (
    <motion.h1
      variants={container}
      initial="hidden"
      animate="visible"
      custom={delay}
      className={cn("flex flex-wrap justify-center", className)}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          variants={word}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className={cn("mr-[0.28em] inline-block", gradientWords.includes(w.replace(/[^\w]/g, "")) && "text-gradient-brand")}
        >
          {w}
        </motion.span>
      ))}
    </motion.h1>
  );
}
