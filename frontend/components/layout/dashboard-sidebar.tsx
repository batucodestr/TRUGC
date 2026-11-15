"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardNavItem } from "@/lib/dashboard-nav";
import type { UserRole } from "@/types";

interface DashboardSidebarProps {
  items: DashboardNavItem[];
  role?: UserRole;
  badges?: Record<string, number>;
  onNavigate?: () => void;
  className?: string;
}

/** Alttaki yükseltme kartı (👑 Premium Marka / Creator Pro). Admin'de gösterilmez. */
const UPGRADE: Partial<Record<UserRole, { title: string; text: string; cta: string; href: string }>> = {
  brand: {
    title: "Premium Marka",
    text: "Daha fazla görünürlük, öncelikli destek ve özel creator erişimi.",
    cta: "Paketi Yükselt",
    href: "/dashboard/brand/odeme",
  },
  creator: {
    title: "Creator Pro",
    text: "Daha fazla kampanya, öncelikli görünürlük ve yüksek kazanç.",
    cta: "Pro'ya Yükselt",
    href: "/dashboard/creator/odeme",
  },
};

export function DashboardSidebar({ items, role, badges = {}, onNavigate, className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const upgrade = role ? UPGRADE[role] : undefined;

  return (
    <div className={cn("flex h-full w-[270px] flex-col border-r border-border bg-sidebar", className)}>
      <nav aria-label="Panel menüsü" className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
        {items.map((item) => {
          // Bölüm "index" sayfaları tam eşleşmelidir — aksi halde her alt sayfada vurgulu kalırlar.
          const path = item.href.split("#")[0];
          const isIndexHref = path === "/manage" || path === "/dashboard/brand" || path === "/dashboard/creator";
          const active = item.href.includes("#") ? false : isIndexHref ? pathname === path : pathname === path || pathname.startsWith(path + "/");
          const Icon = item.icon;
          const count = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-all duration-200",
                active
                  ? "bg-gradient-brand text-white shadow-[0_8px_24px_rgb(139_61_255/0.4)]"
                  : "text-white/85 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {upgrade && (
        <div className="p-4">
          <div className="rounded-2xl border border-brand-light/30 bg-[linear-gradient(160deg,rgb(139_61_255/0.4),rgb(124_58_237/0.12))] p-4 text-center shadow-[0_0_30px_rgb(139_61_255/0.2)]">
            <Crown className="mx-auto h-9 w-9 text-crown" aria-hidden />
            <p className="mt-1 text-lg font-extrabold text-white">{upgrade.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/80">{upgrade.text}</p>
            <Button variant="outline" size="sm" className="mt-3 w-full border-brand-light/60 bg-brand/20" asChild>
              <Link href={upgrade.href} onClick={onNavigate}>
                {upgrade.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
