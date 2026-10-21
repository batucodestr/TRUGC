"use client";

// "Mesaj gönder" — bir konuşma açar ve ilk mesajı yollar.
//
// Panel içindeki iki yön de bunu kullanır: marka → başvuran creator
// (features/brands/applicant-row.tsx) ve creator → marka
// (dashboard/creator/applications). Eskiden panelde konuşma başlatan hiçbir
// yol yoktu: başvuru satırındaki mesaj düğmesi boş /dashboard/messages
// sayfasına gidiyordu, konuşma yalnızca creator'ın herkese açık profilinden
// açılabiliyordu — markanın creator dizinine erişimi yoksa oraya da
// ulaşamıyordu.
//
// Konuşma açma uç noktası aynı katılımcı kümesi için var olan konuşmayı
// döndürür (bkz. apps/messaging/serializers.py::ConversationSerializer.create),
// bu yüzden düğmeye tekrar basmak sohbet listesini çoğaltmaz.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/Auth/AuthProvider";
import { createConversation, sendMessage } from "@/lib/api/messages";
import { getErrorMessage } from "@/lib/error-message";
import { handleMembershipRequired } from "@/lib/membership-gate";

interface StartConversationDialogProps {
  /** Karşı tarafın **kullanıcı** kimliği (creator/brand profil kimliği değil). */
  recipientUserId?: number | string | null;
  recipientName: string;
  /** Konuşmayı bir kampanyaya bağlar; aynı kişiyle farklı kampanyalar ayrı
   *  sohbetlerde yürür. */
  campaignId?: number | string | null;
  /** Mesaj kutusundaki hazır metin (ör. kampanya adı geçen bir açılış). */
  defaultMessage?: string;
  trigger?: React.ReactNode;
}

export function StartConversationDialog({
  recipientUserId,
  recipientName,
  campaignId,
  defaultMessage = "",
  trigger,
}: StartConversationDialogProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!session) {
      toast.error("Mesaj göndermek için giriş yapmalısınız.");
      router.push("/login");
      return;
    }
    if (!recipientUserId) {
      toast.error("Bu kullanıcıya şu anda mesaj gönderilemiyor.", {
        description: "Sayfayı yenileyip tekrar deneyin; sorun sürerse destek hattımızdan bize ulaşın.",
      });
      return;
    }

    setSending(true);
    try {
      const conversation = await createConversation(
        [Number(recipientUserId)],
        campaignId != null ? Number(campaignId) : undefined,
        session.user.email,
      );
      await sendMessage(conversation.id, message.trim(), session.user.email);
      setOpen(false);
      setMessage(defaultMessage);
      toast.success(`Mesajınız ${recipientName} kişisine gönderildi`, {
        description: "Sohbeti mesajlar sayfasından sürdürebilirsiniz.",
      });
      router.push("/dashboard/messages");
    } catch (err) {
      if (
        handleMembershipRequired(err, {
          role: session?.user.role,
          title: "Mesajlaşma ödeme sonrası açılır",
          navigate: router.push,
        })
      ) {
        setOpen(false);
        return;
      }
      toast.error("Mesaj gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2 rounded-full">
            <MessageSquare className="size-3.5" /> Mesaj gönder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{recipientName} kişisine mesaj gönder</DialogTitle>
          <DialogDescription>
            Mesajınız doğrudan panelindeki sohbete düşer ve bildirim gider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="conversation-message">Mesaj</Label>
          <Textarea
            id="conversation-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Merhaba ${recipientName.split(" ")[0]}, ...`}
            rows={5}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            İptal
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="gap-2 rounded-full bg-gradient-brand hover:opacity-90"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
            Mesajı gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
