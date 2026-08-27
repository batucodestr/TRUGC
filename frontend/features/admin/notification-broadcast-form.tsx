"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { broadcastNotification } from "@/lib/api/notifications";
import { getErrorMessage } from "@/lib/error-message";

export function NotificationBroadcastForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "creator" | "brand" | "moderator" | "admin">("all");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await broadcastNotification({
        title,
        body,
        target,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      toast.success(res.scheduled_at ? "Bildirim planlandı" : "Bildirim gönderildi", {
        description: res.scheduled_at ? `${new Date(res.scheduled_at).toLocaleString("tr-TR")} tarihinde gönderilecek.` : "Kuyruğa alındı, kısa süre içinde iletilecek.",
      });
      setTitle("");
      setBody("");
      setScheduledAt("");
    } catch (err) {
      toast.error("Gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="max-w-xl rounded-2xl border-border/70 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Başlık</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. Planlı bakım bildirimi" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Mesaj</Label>
          <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Bildirim içeriği..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Hedef</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm kullanıcılar</SelectItem>
                <SelectItem value="creator">Creator&apos;lar</SelectItem>
                <SelectItem value="brand">Markalar</SelectItem>
                <SelectItem value="moderator">Moderatörler</SelectItem>
                <SelectItem value="admin">Adminler</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Planlanan gönderim (opsiyonel)</Label>
            <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="gap-2 rounded-full bg-gradient-brand hover:opacity-90" disabled={sending || !title.trim()}>
          <Send className="h-4 w-4" /> {sending ? "Gönderiliyor..." : scheduledAt ? "Planla" : "Gönder"}
        </Button>
      </form>
    </Card>
  );
}
