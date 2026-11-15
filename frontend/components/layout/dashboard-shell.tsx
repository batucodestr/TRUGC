"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { Logo } from "@/components/shared/logo";
import { NavLinks } from "@/components/Navbar/nav-links";
import { NotificationBell } from "@/components/shared/notification-bell";
import { AvatarMenu } from "@/components/shared/avatar-menu";
import { useAuth } from "@/components/Auth/AuthProvider";
import { NAV_BY_ROLE } from "@/lib/dashboard-nav";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification, UserRole } from "@/types";

interface DashboardShellProps {
  role: UserRole;
  notifications: Notification[];
  title?: string;
  /** Sol menü sayı rozetleri (ör. { applications: 3, messages: 1 }) — sunucuda gerçek veriden hesaplanır. */
  badges?: Record<string, number>;
  /**
   * NAV_BY_ROLE[role] içinden gizlenecek href'ler — /manage moderatörlere daha az modül gösterir.
   * İkon taşıyan nesneler yerine düz string[] verilir: bu değer Server→Client sınırını geçer ve
   * React fonksiyon/bileşenleri serileştiremez.
   */
  hiddenNavHrefs?: string[];
  children: React.ReactNode;
}

export function DashboardShell({ role, notifications, title, badges, hiddenNavHrefs, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, loading } = useAuth();
  const navItems = hiddenNavHrefs?.length
    ? NAV_BY_ROLE[role].filter((item) => !hiddenNavHrefs.includes(item.href))
    : NAV_BY_ROLE[role];
  const identity = session?.user.role === role ? session.user : null;

  return (
    <div className="min-h-screen">
      {/* Üst bar: logo + site menüsü + bildirim + hesap (tasarımdaki gibi tam genişlik) */}
      <header className="sticky top-0 z-40 flex h-[72px] items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menüyü aç">
          <Menu className="h-5 w-5" />
        </Button>
        <Logo />
        <NavLinks role={role === "admin" ? undefined : role} className="ml-6 hidden xl:flex" />
        {title && <h1 className="ml-2 hidden text-lg font-bold tracking-tight sm:block xl:hidden">{title}</h1>}
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell notifications={notifications} />
          {identity ? (
            <AvatarMenu name={identity.name} avatarUrl={identity.avatarUrl} role={identity.role} />
          ) : loading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : null}
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[290px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Panel menüsü</SheetTitle>
          </SheetHeader>
          <DashboardSidebar items={navItems} role={role} badges={badges} onNavigate={() => setMobileOpen(false)} className="flex w-full border-r-0" />
        </SheetContent>
      </Sheet>

      <div className="flex">
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] shrink-0 lg:block">
          <DashboardSidebar items={navItems} role={role} badges={badges} />
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
