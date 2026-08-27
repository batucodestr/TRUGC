import { Card } from "@/components/ui/card";
import { MessagingApp } from "@/features/messaging/messaging-app";
import { listConversations, listMessages } from "@/lib/api/messages";

export default async function MessagesPage() {
  const conversations = await listConversations();
  const messagesByConvo = Object.fromEntries(
    await Promise.all(conversations.map(async (c) => [c.id, await listMessages(c.id)] as const)),
  );

  return (
    <Card className="h-[calc(100vh-9rem)] overflow-hidden rounded-2xl border-border/70 p-0">
      <MessagingApp initialConversations={conversations} initialMessages={messagesByConvo} />
    </Card>
  );
}
