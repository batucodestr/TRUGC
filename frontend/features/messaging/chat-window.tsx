"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, CheckCheck, File as FileIcon, MoreVertical, Paperclip, Pencil, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessage, Conversation } from "@/types";

// backend/apps/common/validators.py MESSAGE_ATTACHMENT_EXTENSIONS / MAX_MESSAGE_ATTACHMENT_SIZE_BYTES ile eşleşir.
const ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

interface ChatWindowProps {
  conversation: Conversation;
  messages: ChatMessage[];
  onSendMessage: (text: string, attachment?: File) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTyping?: (isTyping: boolean) => void;
  peerTyping?: boolean;
  onEditMessage?: (messageId: string, text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
}

const TYPING_STOP_DELAY_MS = 2000;

export function ChatWindow({
  conversation,
  messages,
  onSendMessage,
  onReact,
  onTyping,
  peerTyping,
  onEditMessage,
  onDeleteMessage,
  onDeleteConversation,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingStopTimer = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation.id]);

  function handleDraftChange(value: string) {
    setDraft(value);
    if (!onTyping) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }
    if (typingStopTimer.current) window.clearTimeout(typingStopTimer.current);
    typingStopTimer.current = window.setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, TYPING_STOP_DELAY_MS);
  }

  function handleSend() {
    if (!draft.trim() && !pendingFile) return;
    onSendMessage(draft.trim(), pendingFile ?? undefined);
    setDraft("");
    setPendingFile(null);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (typingStopTimer.current) window.clearTimeout(typingStopTimer.current);
      onTyping?.(false);
    }
  }

  function handleFileSelect(file: File) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Dosya çok büyük. En fazla 10MB yükleyebilirsiniz.");
      return;
    }
    setPendingFile(file);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function startEdit(msg: ChatMessage) {
    setEditingId(msg.id);
    setEditDraft(msg.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function confirmEdit() {
    if (!editingId) return;
    const trimmed = editDraft.trim();
    if (trimmed) onEditMessage?.(editingId, trimmed);
    cancelEdit();
  }

  function handleDeleteMessage(messageId: string) {
    if (window.confirm("Bu mesajı silmek istediğinize emin misiniz?")) {
      onDeleteMessage?.(messageId);
    }
  }

  function handleDeleteConversation() {
    if (window.confirm(`${conversation.participantName} ile olan tüm sohbeti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      onDeleteConversation?.(conversation.id);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-5 py-3.5">
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={conversation.participantAvatar} alt={conversation.participantName} />
            <AvatarFallback>{conversation.participantName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          {conversation.online && <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />}
        </div>
        <div>
          <p className="text-sm font-semibold">{conversation.participantName}</p>
          {peerTyping ? (
            <p className="text-xs font-medium text-violet-600">yazıyor...</p>
          ) : (
            conversation.online !== undefined && (
              <p className="text-xs text-muted-foreground">{conversation.online ? "Çevrimiçi" : "Çevrimdışı"}</p>
            )
          )}
        </div>
        {onDeleteConversation && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
            onClick={handleDeleteConversation}
            title="Sohbeti sil"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-5">
        <div className="flex flex-col gap-4 py-5">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.isOwn && "flex-row-reverse")}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={msg.senderAvatar} alt={msg.senderName} />
                <AvatarFallback>{msg.senderName.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className={cn("group flex max-w-[75%] flex-col gap-1", msg.isOwn && "items-end")}>
                <div className={cn("flex items-center gap-1", msg.isOwn && "flex-row-reverse")}>
                  {editingId === msg.id ? (
                    <div className="flex w-full min-w-64 flex-col gap-1.5">
                      <Textarea
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            confirmEdit();
                          } else if (e.key === "Escape") {
                            cancelEdit();
                          }
                        }}
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          İptal
                        </Button>
                        <Button size="sm" onClick={confirmEdit} disabled={!editDraft.trim()}>
                          Kaydet
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          msg.isOwn ? "rounded-tr-sm bg-gradient-brand text-white" : "rounded-tl-sm bg-muted",
                        )}
                      >
                        {msg.text}
                      </div>
                      {msg.isOwn && (onEditMessage || onDeleteMessage) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={msg.isOwn ? "end" : "start"}>
                            {onEditMessage && (
                              <DropdownMenuItem onClick={() => startEdit(msg)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Düzenle
                              </DropdownMenuItem>
                            )}
                            {onDeleteMessage && (
                              <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Sil
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </>
                  )}
                </div>

                {msg.attachments?.map((att) => (
                  <div
                    key={att.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs",
                      msg.isOwn && "flex-row-reverse",
                    )}
                  >
                    <FileIcon className="h-4 w-4 text-violet-600" />
                    <span className="font-medium">{att.name}</span>
                    {att.size && <span className="text-muted-foreground">{att.size}</span>}
                  </div>
                ))}

                <div className={cn("flex items-center gap-1.5", msg.isOwn && "flex-row-reverse")}>
                  <span className="text-[11px] text-muted-foreground">{formatRelativeTime(msg.createdAt)}</span>
                  {msg.isEdited && <span className="text-[11px] text-muted-foreground">(düzenlendi)</span>}
                  {msg.isOwn &&
                    (msg.isRead ? (
                      <CheckCheck className="h-3.5 w-3.5 text-violet-600" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    ))}
                </div>

                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={cn("flex gap-1", msg.isOwn && "flex-row-reverse")}>
                    {msg.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        onClick={() => onReact(msg.id, r.emoji)}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                          r.reacted ? "border-violet-600 bg-violet-600/10" : "border-border bg-muted",
                        )}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/60 p-4">
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs">
            <FileIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{pendingFile.name}</span>
            <button type="button" onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-card p-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = "";
            }}
          />
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Bir mesaj yazın..."
            rows={1}
            className="max-h-32 min-h-9 flex-1 resize-none border-none bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
          />
          <Button size="icon" className="h-9 w-9 shrink-0 rounded-full bg-gradient-brand hover:opacity-90" onClick={handleSend} disabled={!draft.trim() && !pendingFile}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
