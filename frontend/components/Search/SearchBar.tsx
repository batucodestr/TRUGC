"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  /** Rotates through a few placeholders when idle & unfocused, for a subtle "alive" feel. Ignored if `placeholder` is set. */
  rotatingPlaceholders?: string[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const DEFAULT_ROTATION = [
  "Niş, platform veya isme göre ara...",
  "\"Los Angeles'ta güzellik creator'ları\" dene...",
  "\"TikTok, 100K+ takipçi\" dene...",
];

export function SearchBar({ placeholder, rotatingPlaceholders = DEFAULT_ROTATION, value, onChange, className }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);
  const usesRotation = !placeholder && !value;

  useEffect(() => {
    if (!usesRotation || focused) return;
    const interval = setInterval(() => {
      setRotationIndex((i) => (i + 1) % rotatingPlaceholders.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [usesRotation, focused, rotatingPlaceholders.length]);

  return (
    <div className={cn("relative w-full", className)}>
      <motion.div
        aria-hidden
        animate={{ opacity: focused ? 1 : 0, scale: focused ? 1 : 0.96 }}
        transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="pointer-events-none absolute -inset-1.5 -z-10 rounded-full bg-violet-500/25 blur-xl"
      />
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={cn(
          "h-12 rounded-full border-border/80 bg-background/80 pl-11 pr-4 text-sm shadow-sm backdrop-blur transition-shadow duration-300 focus-visible:ring-primary/40",
          focused && "shadow-lg shadow-violet-600/15",
        )}
      />
      {usesRotation && (
        <div className="pointer-events-none absolute inset-y-0 left-11 right-4 flex items-center overflow-hidden">
          <AnimatePresence mode="wait">
            {!value && !focused && (
              <motion.span
                key={rotationIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="truncate text-sm text-muted-foreground"
              >
                {rotatingPlaceholders[rotationIndex]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
