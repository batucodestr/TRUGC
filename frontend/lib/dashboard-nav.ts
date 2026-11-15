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
  Wallet,
  Handshake,
  BarChart2,
  PlaySquare,
  Layers,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Sol menüdeki sayı rozeti için anahtar (bkz. DashboardShell ``badges`` prop'u). */
  badgeKey?: string;
}

export const BRAND_NAV: DashboardNavItem[] = [
  { label: "Genel Bakış", href: "/dashboard/brand", icon: LayoutDashboard },
  { label: "Kampanyalarım", href: "/dashboard/brand/campaigns", icon: Megaphone },
  { label: "İçerik Üreticileri", href: "/creators", icon: Users },
  { label: "Başvurular", href: "/dashboard/brand/applications", icon: FileText, badgeKey: "applications" },
  { label: "İş Birlikleri", href: "/dashboard/brand/collaborations", icon: Handshake, badgeKey: "collaborations" },
  { label: "Mesajlar", href: "/dashboard/messages", icon: MessageSquare, badgeKey: "messages" },
  // "Ödemeler" iş birliği ödemeleri ve harcama geçmişidir; "Üyelik paketi"
  // ayrı bir üründür ve markanın paketini aktifleştirdiği yerdir.
  { label: "Ödemeler", href: "/dashboard/brand/payments", icon: CreditCard },
  { label: "Üyelik Paketi", href: "/dashboard/brand/odeme", icon: Wallet },
  { label: "Ayarlar", href: "/dashboard/brand/settings", icon: Settings },
];

export const CREATOR_NAV: DashboardNavItem[] = [
  { label: "Genel Bakış", href: "/dashboard/creator", icon: LayoutDashboard },
  { label: "Kampanyalar", href: "/campaigns", icon: Megaphone, badgeKey: "campaigns" },
  { label: "Başvurularım", href: "/dashboard/creator/applications", icon: Layers, badgeKey: "applications" },
  { label: "İşbirliklerim", href: "/dashboard/creator/collaborations", icon: Handshake, badgeKey: "collaborations" },
  { label: "Kazançlarım", href: "/dashboard/creator/earnings", icon: Wallet },
  { label: "Mesajlar", href: "/dashboard/messages", icon: MessageSquare, badgeKey: "messages" },
  { label: "İçerik Portföyüm", href: "/dashboard/creator/profile#portfolio", icon: PlaySquare },
  { label: "Üyelik Paketi", href: "/dashboard/creator/odeme", icon: BarChart2 },
  { label: "Profilim", href: "/dashboard/creator/profile", icon: User },
  { label: "Ayarlar", href: "/dashboard/creator/settings", icon: Settings },
];

export const ADMIN_NAV: DashboardNavItem[] = [
  { label: "Dashboard", href: "/manage", icon: LayoutDashboard },
  { label: "Kullanıcılar", href: "/manage/users", icon: Users },
  { label: "Creator'lar", href: "/manage/creators", icon: UserCog },
  { label: "Markalar", href: "/manage/brands", icon: Building2 },
  { label: "Kampanyalar", href: "/manage/campaigns", icon: Megaphone },
  { label: "Başvurular", href: "/manage/applications", icon: FileText },
  { label: "Ödemeler", href: "/manage/payments", icon: Wallet },
  { label: "Finans", href: "/manage/finance", icon: CreditCard },
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
