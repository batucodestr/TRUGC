"use client";

import { MessageSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

export function ConversationList({ conversations, activeId, onSelect, search, onSearchChange }: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border/60 p-4">
        <h1 className="text-lg font-semibold">Mesajlar</h1>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Sohbetlerde ara..."
            className="h-9 rounded-full pl-8 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-600">
                <MessageSquare className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium">Henüz mesajınız yok</p>
              <p className="text-xs text-muted-foreground">Bir başvuru veya kampanya üzerinden sohbet başladığında burada görünecek.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  activeId === c.id ? "bg-violet-600/10" : "hover:bg-muted",
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={c.participantAvatar} alt={c.participantName} />
                    <AvatarFallback>{c.participantName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  {c.online && <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", c.unreadCount > 0 ? "font-semibold" : "font-medium")}>{c.participantName}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(c.lastMessageAt)}</span>
                  </div>
                  <p className={cn("truncate text-xs", c.unreadCount > 0 ? "text-foreground" : "text-muted-foreground")}>{c.lastMessage}</p>
                  {c.campaignTitle && <p className="mt-0.5 truncate text-[11px] text-violet-600">{c.campaignTitle}</p>}
                </div>
                {c.unreadCount > 0 && (
                  <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-medium text-white">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
