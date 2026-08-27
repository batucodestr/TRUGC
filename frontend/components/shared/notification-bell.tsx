"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationBellProps {
  notifications: Notification[];
  onOpenNotification?: (notification: Notification) => void;
}

export function NotificationBell({ notifications, onOpenNotification }: NotificationBellProps) {
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-medium text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-4 py-3 text-sm">Bildirimler</DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
                <Bell className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium">Henüz bildirim yok</p>
              <p className="text-xs text-muted-foreground">Yeni gelişmeler burada görünecek.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const content = (
                <>
                  <div className="flex w-full items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", !n.isRead ? "bg-violet-600" : "bg-transparent")} />
                    <span className="text-sm font-medium">{n.title}</span>
                  </div>
                  <span className="pl-3.5 text-xs text-muted-foreground">{n.body}</span>
                  <span className="pl-3.5 text-[11px] text-muted-foreground/70">{formatRelativeTime(n.createdAt)}</span>
                </>
              );
              return (
                <DropdownMenuItem
                  key={n.id}
                  asChild={Boolean(n.link)}
                  className="flex flex-col items-start gap-0.5 whitespace-normal px-4 py-3"
                  onSelect={() => onOpenNotification?.(n)}
                >
                  {n.link ? <Link href={n.link}>{content}</Link> : content}
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
