"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Lock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/components/Auth/AuthProvider";
import {
  deleteConversation,
  deleteMessage,
  editMessage,
  listConversations,
  listMessages,
  normalizeMessage,
  sendMessage,
  type ApiMessage,
} from "@/lib/api/messages";
import { ConversationSocket, type ConversationSocketEvent } from "@/lib/ws/conversation-socket";
import { getMyWallet } from "@/lib/api/wallet";
import { getErrorMessage, isMembershipRequired } from "@/lib/error-message";
import { MESSAGING_LOCKED_TEXT, paymentPathForRole } from "@/lib/membership-gate";
import { ConversationList } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import type { ChatMessage, Conversation } from "@/types";

interface MessagingAppProps {
  initialConversations: Conversation[];
  initialMessages: Record<string, ChatMessage[]>;
}

const CONVERSATIONS_POLL_MS = 15_000;
// Aktif konuşma için güvenlik ağı polling'i — WebSocket, yeni mesajlar için
// birincil taşıyıcıdır; bu yalnızca kaçırmış olabileceği şeyleri yakalar
// (yeniden bağlanma sırasında düşen bir frame, WS consumer'ın yayınlamadığı
// REST üzerinden gönderilmiş bir ek).
const MESSAGES_FALLBACK_POLL_MS = 30_000;

export function MessagingApp({ initialConversations, initialMessages }: MessagingAppProps) {
  const { session } = useAuth();
  const currentUserEmail = session?.user.email;

  const [conversations, setConversations] = useState(initialConversations);
  const [messagesByConvo, setMessagesByConvo] = useState(initialMessages);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [socketOpen, setSocketOpen] = useState(false);
  // Mesajlaşma ödeme sonrası açılır. Bilgi bandı içindir; kilidin kendisini
  // sunucu uygular (destek ekibiyle yazışma serbesttir, bu yüzden mesaj kutusu
  // devre dışı bırakılmaz).
  const [messagingLocked, setMessagingLocked] = useState(false);
  const paymentHref = paymentPathForRole(session?.user.role);

  const socketRef = useRef<ConversationSocket | null>(null);

  const filteredConversations = useMemo(() => {
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.participantName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
  }, [conversations, search]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const activeMessages = activeId ? (messagesByConvo[activeId] ?? []) : [];

  useEffect(() => {
    getMyWallet().then((wallet) => setMessagingLocked(Boolean(wallet?.gates.messagingLocked)));
  }, []);

  const showLockedToast = useCallback(
    (description: string) => {
      setMessagingLocked(true);
      toast.error("Mesajınız gönderilmedi", {
        description,
        action: { label: "Ödemeye geç", onClick: () => window.location.assign(paymentHref) },
      });
    },
    [paymentHref],
  );

  // Yeni/güncellenen konuşmalar için konuşma listesini polle (aşağıdaki
  // WebSocket'in hangi tek konuşmaya abone olduğundan etkilenmez).
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      listConversations(currentUserEmail)
        .then((list) => {
          if (!cancelled) setConversations(list);
        })
        .catch(() => {});
    };
    const interval = window.setInterval(poll, CONVERSATIONS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentUserEmail]);

  // Aktif konuşma başına bir WebSocket bağlantısı — gerçek zamanlı mesajlar,
  // yazıyor göstergesi, okundu bilgisi ve karşı taraf için çevrimiçi durumu.
  useEffect(() => {
    setPeerTyping(false);
    setSocketOpen(false);
    if (!activeId) return;

    const id = activeId;
    const socket = new ConversationSocket(
      id,
      (event: ConversationSocketEvent) => {
        if (event.type === "message") {
          const msg = normalizeMessage(event.message as unknown as ApiMessage, currentUserEmail);
          setMessagesByConvo((prev) => {
            const existing = prev[id] ?? [];
            if (existing.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [id]: [...existing, msg] };
          });
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, lastMessage: msg.text, lastMessageAt: msg.createdAt } : c)),
          );
          if (!msg.isOwn) socket.sendRead();
        } else if (event.type === "typing") {
          setPeerTyping(event.is_typing);
        } else if (event.type === "read") {
          setMessagesByConvo((prev) => ({
            ...prev,
            [id]: (prev[id] ?? []).map((m) => (m.isOwn ? { ...m, isRead: true } : m)),
          }));
        } else if (event.type === "presence") {
          setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, online: event.status === "online" } : c)));
        } else if (event.type === "edit") {
          const editedId = String(event.message.id);
          const body = String(event.message.body ?? "");
          setMessagesByConvo((prev) => ({
            ...prev,
            [id]: (prev[id] ?? []).map((m) => (m.id === editedId ? { ...m, text: body, isEdited: true } : m)),
          }));
        } else if (event.type === "error") {
          if (event.code === "MEMBERSHIP_REQUIRED") showLockedToast(event.message || MESSAGING_LOCKED_TEXT);
          else toast.error("Mesaj gönderilemedi", { description: event.message });
        } else if (event.type === "delete") {
          const deletedId = String(event.message_id);
          setMessagesByConvo((prev) => ({
            ...prev,
            [id]: (prev[id] ?? []).filter((m) => m.id !== deletedId),
          }));
        }
      },
      (status) => setSocketOpen(status === "open"),
    );
    socketRef.current = socket;
    socket.sendRead();

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [activeId, currentUserEmail, showLockedToast]);

  // Yedek polling — yalnızca socket açık değilken anlamlı bir şey yapar.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const poll = () => {
      if (socketOpen) return;
      listMessages(activeId, currentUserEmail)
        .then((msgs) => {
          if (!cancelled) setMessagesByConvo((prev) => ({ ...prev, [activeId]: msgs }));
        })
        .catch(() => {});
    };
    const interval = window.setInterval(poll, MESSAGES_FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeId, currentUserEmail, socketOpen]);

  function handleSelect(id: string) {
    setActiveId(id);
    setMobileShowChat(true);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  }

  const handleSend = useCallback(
    (text: string, attachment?: File) => {
      if (!activeId) return;

      // Eklerin bir WebSocket yolu yoktur (consumer yalnızca düz metni işler)
      // — bunları mevcut optimistic-UI akışıyla REST üzerinden gönder.
      if (attachment) {
        const optimistic: ChatMessage = {
          id: `${activeId}-msg-${Date.now()}`,
          conversationId: activeId,
          senderId: currentUserEmail ?? "me",
          senderName: "Sen",
          text,
          createdAt: new Date().toISOString(),
          isOwn: true,
          attachments: [{ id: "pending", name: attachment.name, type: attachment.type.startsWith("image/") ? "image" : "file", url: URL.createObjectURL(attachment), size: "" }],
        };
        setMessagesByConvo((prev) => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), optimistic] }));
        setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, lastMessage: text || attachment.name, lastMessageAt: optimistic.createdAt } : c)));

        sendMessage(activeId, text, currentUserEmail, attachment)
          .then((saved) => {
            setMessagesByConvo((prev) => ({
              ...prev,
              [activeId]: (prev[activeId] ?? []).map((m) => (m.id === optimistic.id ? saved : m)),
            }));
          })
          .catch((err) => {
            // Gönderilemeyen eki ekranda gönderilmiş gibi bırakma.
            setMessagesByConvo((prev) => ({
              ...prev,
              [activeId]: (prev[activeId] ?? []).filter((m) => m.id !== optimistic.id),
            }));
            if (isMembershipRequired(err)) showLockedToast(getErrorMessage(err));
            else toast.error("Mesaj gönderilemedi", { description: getErrorMessage(err) });
          });
        return;
      }

      // Düz metin: socket üzerinden gönder. Bize de geri yayınlanır
      // (bkz. backend/apps/messaging/consumers.py::chat_message), bu yüzden
      // optimistic bir yer tutucuya gerek yoktur — gerçek mesaj, gidiş-dönüş
      // tamamlanır tamamlanmaz görünür, genellikle 100ms'nin çok altında.
      if (socketRef.current && socketOpen) {
        socketRef.current.sendMessage(text);
        return;
      }

      // Socket bağlı değil (hâlâ yeniden bağlanıyor) — mesajın sessizce
      // kaybolmaması için REST'e geri dön.
      sendMessage(activeId, text, currentUserEmail)
        .then((saved) => {
          setMessagesByConvo((prev) => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), saved] }));
        })
        .catch((err) => {
          if (isMembershipRequired(err)) showLockedToast(getErrorMessage(err));
          else toast.error("Mesaj gönderilemedi", { description: getErrorMessage(err) });
        });
    },
    [activeId, currentUserEmail, socketOpen, showLockedToast],
  );

  function handleReact(messageId: string, emoji: string) {
    // Backend'de bir tepki (reaction) kavramı yok — bu tamamen istemci
    // tarafında/geçici bir anahtardır ve konuşmanın bir sonraki polling'inde üzerine yazılır.
    if (!activeId) return;
    setMessagesByConvo((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] ?? []).map((msg) => {
        if (msg.id !== messageId) return msg;
        const existing = msg.reactions?.find((r) => r.emoji === emoji);
        if (existing) {
          const reactions = msg.reactions!.map((r) =>
            r.emoji === emoji ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted } : r,
          ).filter((r) => r.count > 0);
          return { ...msg, reactions };
        }
        return { ...msg, reactions: [...(msg.reactions ?? []), { emoji, count: 1, reacted: true }] };
      }),
    }));
  }

  function handleTyping(isTyping: boolean) {
    socketRef.current?.sendTyping(isTyping);
  }

  const handleEditMessage = useCallback(
    (messageId: string, text: string) => {
      if (!activeId) return;
      // Optimistic — the socket also echoes an "edit" event back which is a no-op once this has landed.
      setMessagesByConvo((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] ?? []).map((m) => (m.id === messageId ? { ...m, text, isEdited: true } : m)),
      }));
      if (socketRef.current && socketOpen) {
        socketRef.current.sendEdit(messageId, text);
      } else {
        editMessage(activeId, messageId, text, currentUserEmail).catch(() => {});
      }
    },
    [activeId, currentUserEmail, socketOpen],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!activeId) return;
      setMessagesByConvo((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] ?? []).filter((m) => m.id !== messageId),
      }));
      if (socketRef.current && socketOpen) {
        socketRef.current.sendDelete(messageId);
      } else {
        deleteMessage(activeId, messageId).catch(() => {});
      }
    },
    [activeId, socketOpen],
  );

  const handleDeleteConversation = useCallback(async (id: string) => {
    // Aktif olarak konuşulan sohbeti silme — chat kalabalığını temizlemek için.
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setMessagesByConvo((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setActiveId((prev) => (prev === id ? null : prev));
    } catch {
      // best-effort — the conversation list still reflects the last known server state on next poll
    }
  }, []);

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
      <div className={`border-border/60 md:border-r ${mobileShowChat ? "hidden md:block" : "block"}`}>
        <ConversationList
          conversations={filteredConversations}
          activeId={activeId}
          onSelect={handleSelect}
          search={search}
          onSearchChange={setSearch}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      <div className={`${mobileShowChat ? "block" : "hidden md:block"}`}>
        {activeConversation ? (
          <div className="flex h-full flex-col">
            <button
              onClick={() => setMobileShowChat(false)}
              className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5 text-sm text-muted-foreground md:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Sohbetlere dön
            </button>
            {messagingLocked && (
              <div
                role="status"
                className="flex flex-col gap-3 border-b border-violet-600/20 bg-violet-50/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:bg-violet-500/10"
              >
                <span className="flex items-start gap-2.5">
                  <Lock className="mt-0.5 size-4 shrink-0 text-violet-600" />
                  <span>{MESSAGING_LOCKED_TEXT}</span>
                </span>
                <Button size="sm" className="shrink-0 rounded-full bg-gradient-brand hover:opacity-90" asChild>
                  <Link href={paymentHref}>Ödemeye geç</Link>
                </Button>
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ChatWindow
                conversation={activeConversation}
                messages={activeMessages}
                onSendMessage={handleSend}
                onReact={handleReact}
                onTyping={handleTyping}
                peerTyping={peerTyping}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onDeleteConversation={handleDeleteConversation}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState icon={MessageSquare} title="Sohbet seçilmedi" description="Sohbete başlamak için listeden bir konuşma seçin." />
          </div>
        )}
      </div>
    </div>
  );
}
