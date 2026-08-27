"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/components/Auth/AuthProvider";
import { listConversations, listMessages, normalizeMessage, sendMessage, type ApiMessage } from "@/lib/api/messages";
import { ConversationSocket, type ConversationSocketEvent } from "@/lib/ws/conversation-socket";
import { ConversationList } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import type { ChatMessage, Conversation } from "@/types";

interface MessagingAppProps {
  initialConversations: Conversation[];
  initialMessages: Record<string, ChatMessage[]>;
}

const CONVERSATIONS_POLL_MS = 15_000;
// Safety-net poll for the active conversation — the WebSocket is the primary
// transport for new messages; this only catches anything it might have
// missed (a dropped frame during a reconnect window, an attachment sent over
// REST which the WS consumer doesn't broadcast).
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

  const socketRef = useRef<ConversationSocket | null>(null);

  const filteredConversations = useMemo(() => {
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.participantName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
  }, [conversations, search]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const activeMessages = activeId ? (messagesByConvo[activeId] ?? []) : [];

  // Poll the conversation list for new/updated conversations (unaffected by
  // which single conversation the WebSocket below is subscribed to).
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

  // One WebSocket connection per active conversation — real-time messages,
  // typing indicator, read receipts, and online presence for its peer.
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
  }, [activeId, currentUserEmail]);

  // Fallback poll — only does anything meaningful while the socket isn't open.
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

      // Attachments have no WebSocket path (the consumer only handles plain
      // text) — send those over REST with the existing optimistic-UI flow.
      if (attachment) {
        const optimistic: ChatMessage = {
          id: `${activeId}-msg-${Date.now()}`,
          conversationId: activeId,
          senderId: currentUserEmail ?? "me",
          senderName: "You",
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
          .catch(() => {});
        return;
      }

      // Plain text: push over the socket. It's broadcast back to us too
      // (see backend/apps/messaging/consumers.py::chat_message), so no
      // optimistic placeholder is needed — the real message appears as soon
      // as the round trip completes, typically well under 100ms.
      if (socketRef.current && socketOpen) {
        socketRef.current.sendMessage(text);
        return;
      }

      // Socket not connected (still reconnecting) — fall back to REST so the
      // message isn't silently dropped.
      sendMessage(activeId, text, currentUserEmail)
        .then((saved) => {
          setMessagesByConvo((prev) => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), saved] }));
        })
        .catch(() => {});
    },
    [activeId, currentUserEmail, socketOpen],
  );

  function handleReact(messageId: string, emoji: string) {
    // No reaction concept on the backend — this is a purely client-side/ephemeral
    // toggle that gets overwritten by the next poll of the conversation.
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

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
      <div className={`border-border/60 md:border-r ${mobileShowChat ? "hidden md:block" : "block"}`}>
        <ConversationList
          conversations={filteredConversations}
          activeId={activeId}
          onSelect={handleSelect}
          search={search}
          onSearchChange={setSearch}
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
            <div className="min-h-0 flex-1">
              <ChatWindow
                conversation={activeConversation}
                messages={activeMessages}
                onSendMessage={handleSend}
                onReact={handleReact}
                onTyping={handleTyping}
                peerTyping={peerTyping}
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
