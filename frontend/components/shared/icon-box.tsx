import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** 48–56px yuvarlatılmış kare, yarı saydam mor zemin, mor ikon (tasarımdaki ikon kutusu). */
export function IconBox({ icon: Icon, className, size = "md" }: { icon: LucideIcon; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand-light",
        size === "sm" && "h-10 w-10 rounded-xl",
        size === "md" && "h-12 w-12",
        size === "lg" && "h-14 w-14",
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "h-4.5 w-4.5" : "h-6 w-6")} aria-hidden />
    </div>
  );
}
