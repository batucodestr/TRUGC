import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mor gradient kare içinde "T" + "TRUGC" yazısı. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-white", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-lg font-extrabold italic text-white shadow-[0_6px_18px_rgb(139_61_255/0.45)]">
        T
      </span>
      <span>TRUGC</span>
    </Link>
  );
}
