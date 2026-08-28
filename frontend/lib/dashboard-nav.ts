import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Megaphone,
  FileText,
  CreditCard,
  Settings,
  User,
  MessageSquare,
  Users,
  UserCog,
  Building2,
  ShieldCheck,
  Flag,
  BarChart3,
  Activity,
  Bell,
  KeyRound,
  ScrollText,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const BRAND_NAV: DashboardNavItem[] = [
  { label: "Genel Bakış", href: "/dashboard/brand", icon: LayoutDashboard },
  { label: "Kampanyalar", href: "/dashboard/brand/campaigns", icon: Megaphone },
  { label: "Başvurular", href: "/dashboard/brand/applications", icon: FileText },
  { label: "Mesajlar", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Ödemeler", href: "/dashboard/brand/payments", icon: CreditCard },
  { label: "Ayarlar", href: "/dashboard/brand/settings", icon: Settings },
];

// Creator navigasyonu bilinçli olarak minimal tutulur: creator'ın odağı
// kendi iş akışı olmalı (kampanyalara başvurmak, mesajlaşmak, profilini
// yönetmek) — diğer creator'ları keşfetmeye yönelik hiçbir bağlantı
// içermez, o akış markalar içindir. Paketler/kazançlar/ayarlar sayfaları
// hâlâ mevcuttur (kaldırılmadı), yalnızca bu sadeleştirilmiş menüde
// bağlantı verilmez; profil sayfası üzerinden erişilebilir.
export const CREATOR_NAV: DashboardNavItem[] = [
  { label: "Dashboard", href: "/dashboard/creator", icon: LayoutDashboard },
  { label: "Kampanyalar", href: "/campaigns", icon: Megaphone },
  { label: "Mesajlar", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Profil", href: "/dashboard/creator/profile", icon: User },
];

export const ADMIN_NAV: DashboardNavItem[] = [
  { label: "Dashboard", href: "/manage", icon: LayoutDashboard },
  { label: "Kullanıcılar", href: "/manage/users", icon: Users },
  { label: "Creator'lar", href: "/manage/creators", icon: UserCog },
  { label: "Markalar", href: "/manage/brands", icon: Building2 },
  { label: "Kampanyalar", href: "/manage/campaigns", icon: Megaphone },
  { label: "Başvurular", href: "/manage/applications", icon: FileText },
  { label: "Mesajlar", href: "/manage/messages", icon: MessageSquare },
  { label: "Raporlar", href: "/manage/reports", icon: Flag },
  { label: "Doğrulamalar", href: "/manage/verifications", icon: ShieldCheck },
  { label: "Bildirimler", href: "/manage/notifications", icon: Bell },
  { label: "Analitik", href: "/manage/analytics", icon: BarChart3 },
  { label: "Sistem", href: "/manage/system", icon: Activity },
  { label: "Roller & Yetkiler", href: "/manage/roles", icon: KeyRound },
  { label: "Loglar", href: "/manage/logs", icon: ScrollText },
  { label: "Ayarlar", href: "/manage/settings", icon: Settings },
];

export const NAV_BY_ROLE: Record<UserRole, DashboardNavItem[]> = {
  brand: BRAND_NAV,
  creator: CREATOR_NAV,
  admin: ADMIN_NAV,
};
