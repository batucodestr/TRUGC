import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold text-lg tracking-tight", className)}>
      <Image src="/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0" priority />
      <span>
        TR<span className="text-gradient-brand">UGC</span>
      </span>
    </Link>
  );
}
