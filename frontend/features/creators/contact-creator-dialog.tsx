"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare } from "lucide-react";
import type { CreatorPackage } from "@/types";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/components/Auth/AuthProvider";
import { createConversation, sendMessage } from "@/lib/api/messages";
import { getErrorMessage } from "@/lib/error-message";

interface ContactCreatorDialogProps {
  creatorName: string;
  /** The creator's underlying User id — required to actually open a conversation with them. */
  creatorUserId?: string;
  packages: CreatorPackage[];
  trigger?: React.ReactNode;
}

export function ContactCreatorDialog({ creatorName, creatorUserId, packages, trigger }: ContactCreatorDialogProps) {
  const router = useRouter();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(packages[0]?.id ?? "");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!session) {
      toast.error("Mesaj göndermek için giriş yapmalısınız.");
      router.push("/login");
      return;
    }
    if (!creatorUserId) {
      toast.error("Bu içerik üreticisine şu anda mesaj gönderilemiyor.");
      return;
    }

    setSending(true);
    try {
      const pkg = packages.find((p) => p.id === selectedPackage);
      const body = pkg ? `[${pkg.title}] ${message}` : message;
      const conversation = await createConversation([Number(creatorUserId)]);
      await sendMessage(conversation.id, body, session.user.email);
      setOpen(false);
      setMessage("");
      toast.success(`Mesaj ${creatorName} kişisine gönderildi`, {
        description: "Sohbeti mesajlar sayfasından takip edebilirsiniz.",
      });
      router.push("/dashboard/messages");
    } catch (err) {
      toast.error("Mesaj gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="w-full gap-2 rounded-full bg-gradient-brand shadow-sm shadow-violet-600/30 hover:opacity-90">
            <MessageSquare className="h-4 w-4" /> {creatorName.split(" ")[0]} ile iletişime geç
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{creatorName} kişisine mesaj gönder</DialogTitle>
          <DialogDescription>Kampanya detaylarınızı paylaşın, kısa sürede size dönüş yapacaklar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {packages.length > 0 && (
            <div className="space-y-2">
              <Label>Paket</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.title} — {formatCurrency(pkg.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Mesaj</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Merhaba ${creatorName.split(" ")[0]}, seninle şu konuda çalışmak isterim...`}
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            İptal
          </Button>
          <Button onClick={handleSend} disabled={!message.trim() || sending} className="gap-2 bg-gradient-brand hover:opacity-90">
            {sending ? "Gönderiliyor..." : "Mesajı gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
