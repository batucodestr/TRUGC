"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { MagneticButton } from "@/components/Motion/MagneticButton";
import { NotificationBell } from "@/components/shared/notification-bell";
import { AvatarMenu } from "@/components/shared/avatar-menu";
import { useAuth } from "@/components/Auth/AuthProvider";
import { NAV_LINKS } from "@/lib/constants";
import { listNotifications, markNotificationRead } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

const SCROLL_THRESHOLD = 24;
// Backend'de WebSocket yok — bunun yerine yeni bildirimleri polle.
const NOTIFICATIONS_POLL_MS = 30_000;

export function Navbar() {
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Creator'lar için "İçerik Üreticileri Keşfet" bağlantısı gizlenir — o akış
  // markaların creator bulması içindir, bir creator'ın kendi iş akışıyla
  // ilgisi yoktur.
  const navLinks = session?.user.role === "creator" ? NAV_LINKS.filter((link) => link.href !== "/creators") : NAV_LINKS;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (loading || !session) return;
    let cancelled = false;
    const refresh = () => {
      listNotifications()
        .then((list) => {
          if (!cancelled) setNotifications(list);
        })
        .catch(() => {});
    };
    refresh();
    const interval = window.setInterval(refresh, NOTIFICATIONS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loading, session]);

  function handleOpenNotification(notification: Notification) {
    if (notification.isRead) return;
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    markNotificationRead(notification.id).catch(() => {});
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-500",
        scrolled ? "border-border/60 bg-background/75 backdrop-blur-xl shadow-sm" : "border-transparent bg-transparent",
      )}
    >
      <motion.div
        animate={{ height: scrolled ? 60 : 72 }}
        transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <motion.div animate={{ scale: scrolled ? 0.92 : 1 }} transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }} className="origin-left">
          <Logo />
        </motion.div>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href && "text-foreground",
              )}
            >
              {link.label}
              {pathname === link.href ? (
                <motion.span
                  layoutId="navbar-underline"
                  className="absolute inset-x-3 -bottom-0.5 h-px bg-violet-600"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : (
                <span className="absolute inset-x-3 -bottom-0.5 h-px origin-center scale-x-0 bg-violet-600/60 transition-transform duration-300 group-hover:scale-x-100" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!loading && session ? (
            <>
              <NotificationBell notifications={notifications} onOpenNotification={handleOpenNotification} />
              <AvatarMenu name={session.user.name} avatarUrl={session.user.avatarUrl} role={session.user.role} />
            </>
          ) : (
            <>
              <Button variant="ghost" className="rounded-full" asChild>
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <MagneticButton strength={0.3}>
                <Button className="rounded-full bg-gradient-brand shadow-sm shadow-violet-600/30 hover:opacity-90" asChild>
                  <Link href="/register">Kayıt Ol</Link>
                </Button>
              </MagneticButton>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-3 h-px bg-border" />
              {!loading && session ? (
                <Link
                  href={`/dashboard/${session.user.role}`}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Panele git
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted">
                    Giriş Yap
                  </Link>
                  <Button className="mt-2 rounded-full bg-gradient-brand" asChild>
                    <Link href="/register" onClick={() => setOpen(false)}>
                      Kayıt Ol
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </motion.div>
    </header>
  );
}
