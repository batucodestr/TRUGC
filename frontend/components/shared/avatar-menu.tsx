"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/Auth/AuthProvider";
import type { UserRole } from "@/types";

interface AvatarMenuProps {
  name: string;
  avatarUrl: string;
  role: UserRole;
}

const DASHBOARD_HREF: Record<UserRole, string> = {
  brand: "/dashboard/brand",
  creator: "/dashboard/creator",
  admin: "/manage",
};
const SETTINGS_HREF: Record<UserRole, string> = {
  brand: "/dashboard/brand/settings",
  creator: "/dashboard/creator/settings",
  admin: "/manage",
};
const ROLE_LABEL_TR: Record<UserRole, string> = {
  brand: "Marka hesabı",
  creator: "Creator hesabı",
  admin: "Admin hesabı",
};

export function AvatarMenu({ name, avatarUrl, role }: AvatarMenuProps) {
  const router = useRouter();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/");
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 rounded-full pl-1 pr-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">{ROLE_LABEL_TR[role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={DASHBOARD_HREF[role]}>
            <LayoutDashboard className="h-4 w-4" /> Panele git
          </Link>
        </DropdownMenuItem>
        {role === "creator" && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/creator/profile">
              <User className="h-4 w-4" /> Profilim
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={SETTINGS_HREF[role]}>
            <Settings className="h-4 w-4" /> Ayarlar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
