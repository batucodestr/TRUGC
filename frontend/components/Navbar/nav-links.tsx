"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

export interface NavEntry {
  label: string;
  href?: string;
  children?: { label: string; href: string; hideFor?: UserRole }[];
}

/** Üst menü: İçerik Üreticileri ▾, Markalar ▾, Kampanyalar, Nasıl Çalışır?, Fiyatlandırma. */
export const SITE_NAV: NavEntry[] = [
  {
    label: "İçerik Üreticileri",
    children: [
      // Creator'lar diğer creator'ları keşfetmez; bu akış markalar içindir.
      { label: "İçerik Üreticilerini Keşfet", href: "/creators", hideFor: "creator" },
      { label: "Creator Ol", href: "/creator-ol" },
      { label: "Creator Rehberi", href: "/creator-rehberi" },
      { label: "Kazanç Rehberi", href: "/kazanc-rehberi" },
    ],
  },
  {
    label: "Markalar",
    children: [
      { label: "Marka Çözümleri", href: "/marka-cozumleri" },
      { label: "Başarı Hikayeleri", href: "/basari-hikayeleri" },
      { label: "Kampanya Oluştur", href: "/dashboard/brand/campaigns/new" },
    ],
  },
  { label: "Kampanyalar", href: "/campaigns" },
  { label: "Nasıl Çalışır?", href: "/nasil-calisir" },
  { label: "Fiyatlandırma", href: "/fiyatlandirma" },
];

export function entriesFor(role?: UserRole): NavEntry[] {
  return SITE_NAV.map((entry) =>
    entry.children ? { ...entry, children: entry.children.filter((c) => !(c.hideFor && c.hideFor === role)) } : entry,
  ).filter((entry) => !entry.children || entry.children.length > 0);
}

const linkClass =
  "group relative inline-flex items-center gap-1 rounded-full px-3 py-2 text-[15px] font-medium text-white/90 transition-colors hover:text-white";

export function NavLinks({ role, className }: { role?: UserRole; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Ana menü" className={cn("items-center gap-1", className)}>
      {entriesFor(role).map((entry) =>
        entry.children ? (
          <DropdownMenu key={entry.label}>
            <DropdownMenuTrigger className={cn(linkClass, "outline-none data-[state=open]:text-white")}>
              {entry.label}
              <ChevronDown className="h-4 w-4 opacity-80 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl border-border bg-popover/95 p-1.5 backdrop-blur-xl">
              {entry.children.map((child) => (
                <DropdownMenuItem key={child.href} asChild className="rounded-lg">
                  <Link href={child.href}>{child.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            key={entry.href}
            href={entry.href!}
            aria-current={pathname === entry.href ? "page" : undefined}
            className={cn(linkClass, pathname === entry.href && "text-brand-light")}
          >
            {entry.label}
          </Link>
        ),
      )}
    </nav>
  );
}
