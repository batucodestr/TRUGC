import { Card } from "@/components/ui/card";
import { MessagingApp } from "@/features/messaging/messaging-app";
import { listConversations, listMessages } from "@/lib/api/messages";
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";

// Konuşmalar ve mesajlar burada (sunucuda) normalize edilir; normalize eden
// fonksiyonların "hangisi ben, hangisi karşı taraf" ayrımını yapabilmesi için
// giriş yapan kullanıcının e-postası ŞART.
//
// Eskiden bu e-posta geçilmiyordu ve sonuç iki gözle görülür hataydı:
//   1. Kendi gönderdiğin mesajlar karşı tarafın mesajı gibi (yanlış tarafta,
//      karşı tarafın adıyla) görünüyordu — normalizeMessage'daki `isOwn`
//      her mesaj için false kalıyordu.
//   2. Sohbet listesi ve başlık, katılımcı kümesinin ilk elemanını "karşı
//      taraf" sayıyordu; bu çoğu zaman kullanıcının kendisiydi, yani kişi
//      kendi adıyla konuşuyor gibi görünüyordu.
// Hata yalnızca 15/30 saniyelik polling bir kez çalıştığında düzeliyordu;
// WebSocket açıkken mesaj polling'i hiç çalışmadığı için kalıcıydı.
export default async function MessagesPage() {
  const me = await apiClient.get<{ email: string }>(AUTH_ENDPOINTS.me);
  const conversations = await listConversations(me.email);
  const messagesByConvo = Object.fromEntries(
    await Promise.all(conversations.map(async (c) => [c.id, await listMessages(c.id, me.email)] as const)),
  );

  return (
    <Card className="h-[calc(100vh-9rem)] overflow-hidden rounded-2xl border-border/70 p-0">
      <MessagingApp initialConversations={conversations} initialMessages={messagesByConvo} />
    </Card>
  );
}
