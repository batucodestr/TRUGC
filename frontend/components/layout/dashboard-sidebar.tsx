"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import type { DashboardNavItem } from "@/lib/dashboard-nav";

interface DashboardSidebarProps {
  items: DashboardNavItem[];
  onNavigate?: () => void;
  className?: string;
}

export function DashboardSidebar({ items, onNavigate, className }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full w-64 flex-col border-r border-border/60 bg-sidebar", className)}>
      <div className="flex h-16 shrink-0 items-center border-b border-border/60 px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          // Bölüm "index" sayfaları (/manage, /dashboard/brand, /dashboard/creator) tam
          // olarak eşleşmelidir — aksi halde her alt sayfada da vurgulu kalırlar, çünkü
          // her alt sayfanın pathname'i de index href'i ile başlar.
          const isIndexHref = item.href === "/manage" || item.href === "/dashboard/brand" || item.href === "/dashboard/creator";
          const active = isIndexHref ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors",
                active ? "bg-gradient-brand text-white shadow-sm shadow-violet-600/30" : "hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          ← Siteye dön
        </Link>
      </div>
    </div>
  );
}
