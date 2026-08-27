"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useAuth } from "@/components/Auth/AuthProvider";
import { applyToCampaign } from "@/lib/api/applications";
import { getErrorMessage } from "@/lib/error-message";

export function ApplyCampaignDialog({ campaignId, campaignTitle }: { campaignId: string; campaignTitle: string }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [sending, setSending] = useState(false);

  async function handleApply() {
    setSending(true);
    try {
      await applyToCampaign({
        campaignId,
        message,
        proposedRate: price ? Number(price) : undefined,
      });
      setOpen(false);
      setMessage("");
      setPrice("");
      toast.success("Başvurunuz gönderildi!", {
        description: `Marka, "${campaignTitle}" kampanyasına başvurunuzu kısa süre içinde inceleyecek.`,
      });
    } catch (err) {
      toast.error("Başvuru gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  if (session && session.user.role !== "creator") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full gap-2 rounded-full bg-gradient-brand shadow-sm shadow-violet-600/30 hover:opacity-90">
          <Send className="h-4 w-4" /> Kampanyaya başvur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>&quot;{campaignTitle}&quot; kampanyasına başvur</DialogTitle>
          <DialogDescription>Markaya neden uygun olduğunuzu anlatın ve ücretinizi teklif edin.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Teklif edilen fiyat (USD)</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="örn. 450" />
          </div>
          <div className="space-y-2">
            <Label>Mesaj</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="İlgili deneyiminizi, içerik tarzınızı ve müsaitlik durumunuzu paylaşın..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            İptal
          </Button>
          <Button onClick={handleApply} disabled={!message.trim() || !price || sending} className="gap-2 bg-gradient-brand hover:opacity-90">
            {sending ? "Gönderiliyor..." : "Başvuruyu gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
