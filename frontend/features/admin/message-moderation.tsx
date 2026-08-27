"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Flag, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  listAdminConversations,
  listAdminConversationMessages,
  flagMessage,
  deleteMessage,
  type AdminConversation,
  type AdminMessage,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";

const ROLE_LABEL_TR: Record<string, string> = { brand: "Marka", creator: "Creator", admin: "Yönetici", moderator: "Moderatör" };

export function MessageModeration({ initialConversations }: { initialConversations: AdminConversation[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminMessage | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMessages(true);
    listAdminConversationMessages(activeId)
      .then(setMessages)
      .catch((err) => toast.error("Mesajlar yüklenemedi", { description: getErrorMessage(err) }))
      .finally(() => setLoadingMessages(false));
  }, [activeId]);

  async function refreshConversations() {
    try {
      setConversations(await listAdminConversations());
    } catch {
      // best-effort refresh
    }
  }

  async function handleFlag(message: AdminMessage) {
    setPendingId(message.id);
    try {
      await flagMessage(message.id);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, isFlagged: true } : m)));
      toast.success("Mesaj spam olarak işaretlendi");
    } catch (err) {
      toast.error("İşlem başarısız", { description: getErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setConfirmLoading(true);
    try {
      await deleteMessage(confirmDelete.id);
      setMessages((prev) => prev.filter((m) => m.id !== confirmDelete.id));
      toast.success("Mesaj silindi");
      setConfirmDelete(null);
      await refreshConversations();
    } catch (err) {
      toast.error("Silinemedi", { description: getErrorMessage(err) });
    } finally {
      setConfirmLoading(false);
    }
  }

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  if (activeId && activeConversation) {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveId(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Konuşmalara dön
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {activeConversation.participants.map((p) => (
            <Badge key={p.id} variant="outline" className="rounded-full font-normal">
              {p.email} · {ROLE_LABEL_TR[p.role] ?? p.role}
            </Badge>
          ))}
        </div>

        {loadingMessages ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Mesaj yok" description="Bu konuşmada henüz mesaj bulunmuyor." />
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <Card key={m.id} className={cn("flex items-start justify-between gap-3 rounded-xl border-border/70 p-3.5", m.isFlagged && "border-rose-300 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-500/5")}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">{m.senderEmail}</p>
                    {m.isFlagged && (
                      <Badge className="gap-1 rounded-full border-none bg-rose-100 font-normal text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                        <Flag className="h-3 w-3" /> Spam
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground/70">{formatRelativeTime(m.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm">{m.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {pendingId === m.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      {!m.isFlagged && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleFlag(m)} title="Spam işaretle">
                          <Flag className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => setConfirmDelete(m)} title="Sil">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={confirmDelete !== null}
          onOpenChange={(open) => !open && setConfirmDelete(null)}
          title="Mesajı sil"
          description="Bu mesaj kalıcı olarak silinecek. Bu işlem geri alınamaz."
          confirmLabel="Sil"
          loading={confirmLoading}
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  if (conversations.length === 0) {
    return <EmptyState icon={MessageSquare} title="Henüz konuşma yok" description="Marka ve creator'lar mesajlaşmaya başladığında burada listelenecek." />;
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <button key={conv.id} onClick={() => setActiveId(conv.id)} className="block w-full text-left">
          <Card className="flex flex-col gap-3 rounded-2xl border-border/70 p-4 transition-colors hover:border-violet-600/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {conv.participants.map((p) => (
                  <Badge key={p.id} variant="outline" className="rounded-full font-normal">
                    {p.email} · {ROLE_LABEL_TR[p.role] ?? p.role}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 truncate text-sm text-muted-foreground">{conv.lastMessageBody || "Henüz mesaj yok"}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <p>{conv.messageCount} mesaj</p>
              <p className="mt-0.5">{formatRelativeTime(conv.lastMessageAt ?? conv.updatedAt)}</p>
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}
