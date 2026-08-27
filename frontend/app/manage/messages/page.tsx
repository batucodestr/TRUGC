import { MessageModeration } from "@/features/admin/message-moderation";
import { listAdminConversations } from "@/lib/api/admin";

export default async function AdminMessagesPage() {
  const conversations = await listAdminConversations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mesaj denetimi</h1>
        <p className="text-muted-foreground">Platformdaki tüm konuşmalara genel bakış — {conversations.length} konuşma.</p>
      </div>
      <MessageModeration initialConversations={conversations} />
    </div>
  );
}
