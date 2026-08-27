"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
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
  /**
   * Hrefs to hide from NAV_BY_ROLE[role] — used by /manage to show fewer
   * modules to moderators than full admins. A plain string[] (not the nav
   * items themselves, which carry LucideIcon component references) because
   * this value crosses the Server->Client Component boundary from
   * app/manage/layout.tsx, and React can't serialize functions/components
   * across that boundary — passing icon-bearing objects here throws
   * "Functions cannot be passed directly to Client Components".
   */
  hiddenNavHrefs?: string[];
  children: React.ReactNode;
}

export function DashboardShell({ role, notifications, title, hiddenNavHrefs, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, loading } = useAuth();
  const navItems = hiddenNavHrefs?.length
    ? NAV_BY_ROLE[role].filter((item) => !hiddenNavHrefs.includes(item.href))
    : NAV_BY_ROLE[role];
  const identity = session?.user.role === role ? session.user : null;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <DashboardSidebar items={navItems} className="hidden lg:flex" />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <DashboardSidebar items={navItems} onNavigate={() => setMobileOpen(false)} className="flex w-full border-r-0" />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-lg sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            {title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell notifications={notifications} />
            {identity ? (
              <AvatarMenu name={identity.name} avatarUrl={identity.avatarUrl} role={identity.role} />
            ) : loading ? (
              <Skeleton className="h-9 w-9 rounded-full" />
            ) : null}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
